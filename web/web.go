package web

import (
  "encoding/json"
  "strings"
  "net/http"
  "html/template"
  "appengine"
  "appengine/user"
)

var loginTemplate = template.Must(template.ParseFiles("html/login.html"))

func loginPage(w http.ResponseWriter, r *http.Request) {
  c := appengine.NewContext(r)

   loginUrl, _ := user.LoginURL(c, r.URL.Path)
   err := loginTemplate.Execute(w, loginUrl)
   if err != nil {
     ErrorPage(c, w, err)
     return
   }
}

func GetDomain(c appengine.Context) string {
  return strings.Split(user.Current(c).Email, "@")[1]
}

func Auth(c appengine.Context, w http.ResponseWriter, r *http.Request) (appengine.Context, string, bool) {
  if user.Current(c) == nil {
    loginPage(w, r)
    return nil, "", true
  }

  domain := GetDomain(c)
  c, err := appengine.Namespace(c, domain)
  if err != nil {
    ErrorPage(c, w, err)
    return nil, "", true
  }

  c.Infof("Using namespace: %v", domain)
  return c, domain, false
}

func NotFound(w http.ResponseWriter, r *http.Request) {
  http.Error(w, "Not found", 404)
}

func ErrorPage(c appengine.Context, w http.ResponseWriter, err error) {
  c.Errorf("Error: %v", err.Error())
  http.Error(w, err.Error(), http.StatusInternalServerError)
}

func ErrorJson(c appengine.Context, w http.ResponseWriter, err error) {
  c.Errorf("Error: %v", err.Error())
  response := struct{
    Ok bool
    Error string
  }{false, err.Error()}
  res, err := json.Marshal(response)
  http.Error(w, string(res), http.StatusInternalServerError)
}
