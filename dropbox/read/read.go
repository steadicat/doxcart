package dropboxRead

import (
	"fmt"
	"strings"
	"bytes"
	"io/ioutil"
	"net/url"
	"net/http"
	"encoding/json"
	"appengine"
	"appengine/delay"
	"appengine/datastore"
	"appengine/urlfetch"
	"web"
	"page"
	"cache"
	"sitemap"
	"dropbox/common"
)

func Init() {
	http.HandleFunc("/_/dropbox/webhook", webhookHandler)
}

func webhookHandler(w http.ResponseWriter, r *http.Request) {
	c := appengine.NewContext(r)
	if r.Method == "GET" {
		r.ParseForm()
		challenge := r.Form["challenge"][0]
		fmt.Fprintf(w, challenge)
		return
	}
	decoder := json.NewDecoder(r.Body)
	var body struct {
		Delta struct {
			Users []int
		}
	}
	err := decoder.Decode(&body)
	if err != nil {
		c.Warningf("Error processing Dropbox webhook: %v", err.Error())
		web.ErrorJson(c, w, err)
		return
	}
	c.Infof("Dropbox notified us of changes to users: %v", body.Delta.Users)
	afterWebhook.Call(c, body.Delta.Users)
}

type DeltaResponse struct {
	HasMore bool `json:"has_more"`
	Reset bool `json:"reset"`
	Cursor string `json:"cursor"`
	Entries []interface{} `json:"entries"`
}

var afterWebhook = delay.Func("AfterWebhook", func(c appengine.Context, userIds []int) {
	for _, id := range userIds {
		c.Infof("Getting changes for user %v", id)

		q := datastore.NewQuery("ServiceToken").Filter("Id =", fmt.Sprintf("%v", id)).Limit(1)
		var tokens []dropboxCommon.ServiceToken
	_, err := q.GetAll(c, &tokens)
		if err != nil {
			c.Warningf("Error finding token for Dropbox user %v: %v", id, err.Error())
			return
		}
		if len(tokens) == 0 {
			c.Warningf("Token for Dropbox user %v not found", id)
			return
		}

		domain := strings.Split(tokens[0].User, "@")[1]

		hasMore := true
		cursor := ""
		for hasMore {
			hasMore, cursor = fetchDelta(c, domain, tokens[0], cursor)
		}

		c, err = appengine.Namespace(c, domain)
		if err != nil {
			c.Warningf("Error switching to namespace %v: %v", domain, err.Error())
			return
		}

	}
})

func fetchDelta(gc appengine.Context, domain string, serviceToken dropboxCommon.ServiceToken, cursor string) (bool, string) {
	c, err := appengine.Namespace(gc, domain)
	if err != nil {
		c.Warningf("Error switching to namespace %v: %v", domain, err.Error())
		return false, ""
	}

	v := url.Values{}
	v.Set("path_prefix", dropboxCommon.PathPrefix)
	if cursor != "" {
		v.Set("cursor", cursor)
	} else if serviceToken.Cursor != "" {
		v.Set("cursor", serviceToken.Cursor)
	}

	req, err := http.NewRequest("POST", "https://api.dropbox.com/1/delta", bytes.NewBufferString(v.Encode()))
	if err != nil {
		c.Warningf("Error preparing request for /delta for Dropbox user %v: %v", domain, err.Error())
		return false, ""
	}
	req.Header.Set("Authorization", "Bearer " + serviceToken.Token)
	client := urlfetch.Client(c)
	resp, err := client.Do(req)
	if err != nil {
		c.Warningf("Error requesting /delta for Dropbox user %v: %v", domain, err.Error())
		return false, ""
	}
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		c.Warningf("Error reading /delta response for Dropbox user %v: %v", domain, err.Error())
		return false, ""
	}
	c.Infof("Got changes for user %v: %v", domain, string(body))
	var response DeltaResponse
	err = json.Unmarshal(body, &response)
	if err != nil {
		c.Warningf("Error parsing /delta JSON for Dropbox user %v: %v", domain, err.Error())
		return false, ""
	}

	changed := false

	for _, entry := range response.Entries {
		pair := entry.([]interface{})
		path := pair[0].(string)
		path = strings.TrimPrefix(path, strings.ToLower(dropboxCommon.PathPrefix))
		if !strings.HasSuffix(path, ".md") {
			continue
		}
		path = strings.TrimSuffix(path, ".md")

		if pair[1] == nil {
			if path == "/home" {
				path = "/"
			}
			c.Infof("File deleted: %v", path)
			changed = true
			err = page.Set(c, domain, path, "", "", "Dropbox", true, true)
			if err != nil {
				c.Warningf("Error deleting file %v: %v", path, err.Error())
				return false, ""
			}
			err := datastore.Delete(c, datastore.NewKey(c, "Page", path, 0, nil))
			if err != nil {
				c.Warningf("Error deleting file %v: %v", path, err.Error())
				return false, ""
			}
			continue
		}

		metadata := pair[1].(map[string]interface{})
		if metadata["is_dir"] == true {
			continue
		}

		rev := metadata["rev"].(string)
		res, err := cache.Get(gc, "dropbox:rev:" + rev)
		if err != nil || res != nil {
   		c.Infof("Ignoring seen rev %v", rev)
   		cache.Clear(gc, "dropbox:rev:" + rev)
			continue
		}

		c.Infof("File changed: %v", path)
		changed = true

		u := "https://api-content.dropbox.com/1/files/dropbox" + dropboxCommon.PathPrefix + path + ".md"
		c.Infof("Getting %v", u)
		req, err := http.NewRequest("GET", u, nil)
		if err != nil {
			c.Warningf("Error preparing request: %v", err.Error())
			return false, ""
		}
		req.Header.Set("Authorization", "Bearer " + serviceToken.Token)
		client := urlfetch.Client(c)
		resp, err := client.Do(req)
		if err != nil {
			c.Warningf("Error getting file: %v", err.Error())
			return false, ""
		}
		text, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			c.Warningf("Error reading file content: %v", err.Error())
			return false, ""
		}

		if path == "/home" {
			path = "/"
		}
		err = page.Set(c, domain, path, string(text), "", "Dropbox", false, true)
		if err != nil {
			c.Warningf("Error saving file from dropbox: %v", err.Error())
			return false, ""
		}
		p := sitemap.Page{path}
		_, err = datastore.Put(c, datastore.NewKey(c, "Page", path, 0, nil), &p)
		if err != nil {
			c.Warningf("Error creating file %v: %v", path, err.Error())
			return false, ""
		}
	}

	if !response.HasMore {

		if (changed) {
			err = cache.Clear(c, "sitemap")
			if err != nil {
				c.Warningf("Error clearing sitemap cache: %v", err.Error())
				return false, ""
			}
		}

		dropboxCommon.SetToken(c, serviceToken.User, serviceToken.Token, serviceToken.Id, response.Cursor)
		if err != nil {
			c.Warningf("Error saving Dropbox cursor %v: %v", response.Cursor, err.Error())
			return false, ""
		}
	}

	return response.HasMore, response.Cursor
}
