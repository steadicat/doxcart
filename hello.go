package hello

import (
	"runtime"
	"fmt"
	"html/template"
	"net/http"
	"time"
	"encoding/json"
	"appengine"
	"appengine/user"
	"appengine/datastore"
	"appengine/memcache"
	"markdown"
	"sitemap"
)

type Page struct {
	Path string
}

type PageVersion struct {
	Path string
	Content string `datastore:",noindex"`
	Date time.Time
	Author string
}

func init() {
	http.HandleFunc("/", root)
}

func pageKey(c appengine.Context, url string) *datastore.Key {
	return datastore.NewKey(c, "PageVersion", url, 0, nil)
}

func getLatestPageVersion(c appengine.Context, path string) (*PageVersion, error) {

	q := datastore.NewQuery("PageVersion").Ancestor(pageKey(c, path)).Order("-Date").Limit(1)
	versions := make([]PageVersion, 0, 1)

	_, err := q.GetAll(c, &versions)
	if err != nil {
		return nil, nil
	}

	if len(versions) == 0 {
		return &PageVersion{
			Content: "Empty page.",
			Date: time.Now(),
		}, nil
	} else {
		return &versions[0], nil
	}
}

func cachePageContent(c appengine.Context, path string, text string, html string) error {
	textKey := "text:" + path
	htmlKey := "html:" + path
	contentItem := &memcache.Item{
		Key: textKey,
		Value: []byte(text),
	}
	htmlItem := &memcache.Item{
		Key: htmlKey,
		Value: []byte(html),
	}
	return memcache.SetMulti(c, []*memcache.Item{contentItem, htmlItem})
}

func getPage(c appengine.Context, path string) (string, template.HTML, error) {
	textKey := "text:" + path
	htmlKey := "html:" + path
	cached, err := memcache.GetMulti(c, []string{textKey, htmlKey});
	if err != nil && err != memcache.ErrCacheMiss {
		return "", template.HTML(""), err
	}

	if (cached[textKey] != nil) && (cached[htmlKey] != nil) {
		return string(cached[textKey].Value), template.HTML(cached[htmlKey].Value), nil
	}

	version, err := getLatestPageVersion(c, path)
	if err != nil {
		return "", template.HTML(""), err
	}

	html := markdown.Markdown(version.Content)
	cachePageContent(c, path, version.Content, html)
	return version.Content, template.HTML(html), nil
}

func errorPage(w http.ResponseWriter, err error) {
	trace := make([]byte, 1024)
	count := runtime.Stack(trace, true)
  http.Error(w, err.Error(), http.StatusInternalServerError)
	fmt.Fprintf(w, "Recover from panic: %s\n", err)
	fmt.Fprintf(w, "Stack of %d bytes: %s\n", count, trace)
}

func root(w http.ResponseWriter, r *http.Request) {

	if r.Method == "PUT" {
		save(w, r)
		return
	}

	c := appengine.NewContext(r)
	pages, err := sitemap.Get(c)
	if (err != nil) {
		errorPage(w, err)
		return
	}

	text, html, err := getPage(c, r.URL.Path)
	if (err != nil) {
		errorPage(w, err)
		return
	}

	logout, _ := user.LogoutURL(c, "/")

	data := struct {
		Text string
		Html template.HTML
		CurrentUrl string
		LogoutUrl string
		Pages []string
	} {text, html, r.URL.Path, logout, pages}
	if err = pageTemplate.Execute(w, data); err != nil {
		errorPage(w, err)
		return
	}
}

var pageTemplate = template.Must(template.ParseFiles("html/index.html"))

type putBody struct {
	Content string
}

func save(w http.ResponseWriter, r *http.Request) {
	decoder := json.NewDecoder(r.Body)
	var body putBody
	err := decoder.Decode(&body)
	if err != nil {
		errorPage(w, err)
		return
	}

	c := appengine.NewContext(r)
	g := PageVersion{
		Content: body.Content,
		Date: time.Now(),
	}
	if u := user.Current(c); u != nil {
		g.Author = u.String()
	}

	err = sitemap.Add(c, r.URL.Path)
	if (err != nil) {
		errorPage(w, err)
		return
	}

	key := datastore.NewIncompleteKey(c, "PageVersion", pageKey(c, r.URL.Path))
	_, err = datastore.Put(c, key, &g)
	if err != nil {
		errorPage(w, err)
		return
	}

	html := markdown.Markdown(body.Content)
	cachePageContent(c, r.URL.Path, body.Content, html)
	body.Content = html;
	encoder := json.NewEncoder(w)
	encoder.Encode(body)
}
