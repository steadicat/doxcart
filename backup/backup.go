package backup

import (
  "appengine"
  "appengine/user"
  "appengine/urlfetch"
  "appengine/datastore"
  "encoding/json"
  "net/url"
  "net/http"
  "io/ioutil"
  "bytes"
  "web"
  "cache"
  "config"
)

const dropboxEndpoint = "https://www.dropbox.com/1/oauth2/authorize"
const dropboxCallbackDev = "http://localhost:8080/_/dropbox/oauth"
const dropboxCallback = "https://doxcart.appspot.com/_/dropbox/oauth"
const dropboxTokenEndpoint = "https://api.dropbox.com/1/oauth2/token"

func getCallbackUrl() string {
  if appengine.IsDevAppServer() {
    return dropboxCallbackDev
  } else {
    return dropboxCallback
  }
}

func getLoginUrl() string {

  v := url.Values{}
  v.Set("response_type", "code")
  v.Set("client_id", config.DropboxAppKey)
  v.Set("redirect_uri", getCallbackUrl())
  u, _ := url.Parse(dropboxEndpoint)
  u.RawQuery = v.Encode()
  return u.String()
}

func DropboxHandler(w http.ResponseWriter, r *http.Request) {
  u := getLoginUrl()
  c := appengine.NewContext(r)
  c.Infof("Redirecting to: %v", u)
  http.Redirect(w, r, u, http.StatusFound)
}

type ServiceToken struct {
  User string
  Service string
  Token string
  Id string
}

func DropboxOauthHandler(w http.ResponseWriter, r *http.Request) {
  c := appengine.NewContext(r)
  c, _, done := web.Auth(c, w, r);
  if done == true { return }

  r.ParseForm()
  v := url.Values{}
  v.Set("code", r.Form["code"][0])
  v.Set("grant_type", "authorization_code")
  v.Set("client_id", config.DropboxAppKey)
  v.Set("client_secret", config.DropboxAppSecret)
  v.Set("redirect_uri", getCallbackUrl())

  client := urlfetch.Client(c)
  resp, err := client.Post(dropboxTokenEndpoint, "application/x-www-form-urlencoded", bytes.NewBufferString(v.Encode()))
  if err != nil {
    web.ErrorPage(w, err)
    return
  }
  body, err := ioutil.ReadAll(resp.Body)
  if err != nil {
    web.ErrorPage(w, err)
    return
  }
  c.Infof("HTTP POST returned %v", string(body))
  response := make(map[string]string)
  json.Unmarshal(body, &response)
  c.Infof("Unmarshaled to %v", response)
  err = SetDropboxToken(c, response["access_token"], response["uid"])
  if err != nil {
    web.ErrorPage(w, err)
    return
  }
  http.Redirect(w, r, "/", http.StatusFound)
}

func DropboxDisconnectHandler(w http.ResponseWriter, r *http.Request) {
  c := appengine.NewContext(r)
  c, _, done := web.Auth(c, w, r);
  if done == true { return }

  domain := web.GetDomain(c)
  token, err := GetDropboxToken(c, domain)
  if err != nil {
    web.ErrorPage(w, err)
    return
  }

  if token == "" {
    http.Redirect(w, r, "/", http.StatusFound)
  }

  err = clearToken(c, token)
  if err != nil {
    web.ErrorPage(w, err)
    return
  }
  http.Redirect(w, r, "/", http.StatusFound)
}

func clearToken(c appengine.Context, token string) error {
  u := "https://api.dropbox.com/1/disable_access_token"
  c.Infof("Posting to %v", u)
  req, err := http.NewRequest("POST", u, bytes.NewBufferString(""))
  if err != nil { return err }
  req.Header.Set("Authorization", "Bearer " + token)
  client := urlfetch.Client(c)
  resp, err := client.Do(req)
  if err != nil { return err }
  body, err := ioutil.ReadAll(resp.Body)
  if err != nil { return err }
  c.Infof("Got %v", string(body))

  domain := web.GetDomain(c)
  err = cache.Clear(c, "dropbox:" + domain)
  if err != nil { return err }
  err = datastore.Delete(c, datastore.NewKey(c, "ServiceToken", web.GetDomain(c) + "/dropbox", 0, nil))
  if err == datastore.ErrNoSuchEntity { return nil }
  return err
}

func SetDropboxToken(c appengine.Context, accessToken string, uid string) error {
  email := user.Current(c).Email
  serviceToken := ServiceToken{
    email,
    "dropbox",
    accessToken,
    uid,
  }
  c.Infof("Obj %v", serviceToken)
  domain := web.GetDomain(c)
  _, err := datastore.Put(c, datastore.NewKey(c, "ServiceToken", domain + "/dropbox", 0, nil), &serviceToken)
  if err != nil { return err }
  err = cache.Set(c, "dropbox:" + domain, []byte(accessToken))
  return err
}

func GetDropboxToken(c appengine.Context, domain string) (string, error) {
  accessToken, err := cache.Get(c, "dropbox:" + domain)
  if err != nil { return "", err }
  if accessToken != nil { return string(accessToken), nil }

  serviceToken := ServiceToken{}
  err = datastore.Get(c, datastore.NewKey(c, "ServiceToken", domain + "/dropbox", 0, nil), &serviceToken)
  if err == datastore.ErrNoSuchEntity {
    err = cache.Set(c, "dropbox:" + domain, []byte(""))
    return "", nil
  }
  if err != nil { return "", err }
  err = cache.Set(c, "dropbox:" + domain, []byte(serviceToken.Token))
  return serviceToken.Token, nil
}

func SaveFile(c appengine.Context, domain string, path string, content string) error {
  token, err := GetDropboxToken(c, domain)
  if err != nil { return err }
  if token == "" { return nil }

  if path == "/" { path = "/home" }

  u := "https://api-content.dropbox.com/1/files_put/dropbox/Doxcart" + path + ".md"
  c.Infof("Putting to %v", u)
  req, err := http.NewRequest("PUT", u, bytes.NewBufferString(content))
  if err != nil { return err }
  req.Header.Set("Authorization", "Bearer " + token)
  client := urlfetch.Client(c)

  if err != nil { return err }
  resp, err := client.Do(req)
  if err != nil { return err }
  body, err := ioutil.ReadAll(resp.Body)
  if err != nil { return err }
  c.Infof("Got %v", string(body))
  return nil
}
