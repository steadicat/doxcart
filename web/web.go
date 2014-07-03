package web

import (
  "fmt"
  "runtime"
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
     ErrorPage(w, err)
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
    ErrorPage(w, err)
    return nil, "", true
  }

  c.Infof("Using namespace: %v", domain)
  return c, domain, false
}

func NotFound(w http.ResponseWriter, r *http.Request) {
  http.Error(w, "Not found", 404)
}

func ErrorPage(w http.ResponseWriter, err error) {
  trace := make([]byte, 1024)
  count := runtime.Stack(trace, true)
  http.Error(w, err.Error(), http.StatusInternalServerError)
  fmt.Fprintf(w, "Recover from panic: %s\n", err)
  fmt.Fprintf(w, "Stack of %d bytes: %s\n", count, trace)
}
