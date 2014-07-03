package main

import (
  "fmt"
  "bytes"
  "html/template"
  "net/http"
  "encoding/json"
  "appengine"
  "appengine/user"
  "page"
  "web"
  "sitemap"
  "backup"
  "crypto/md5"
  "github.com/mjibson/appstats"
)

func init() {
  http.HandleFunc("/favicon.ico", web.NotFound)
  http.HandleFunc("/robots.txt", web.NotFound)
  http.HandleFunc("/s", searchHandler)
  http.HandleFunc("/_/dropbox", backup.DropboxHandler)
  http.HandleFunc("/_/dropbox/oauth", backup.DropboxOauthHandler)
  http.HandleFunc("/_/dropbox/disconnect", backup.DropboxDisconnectHandler)
  http.Handle("/", appstats.NewHandler(root))
}

var homeTemplate = template.Must(template.ParseFiles("html/index.html"))

func root(c appengine.Context, w http.ResponseWriter, r *http.Request) {
  c, domain, done := web.Auth(c, w, r);
  if done == true { return }

  if r.Method == "PUT" {
    save(c, w, r)
    return
  }

  var nav []sitemap.NavLink
  var text string
  var html template.HTML
  var token string
  var logout string

  errc := make(chan error)
  go func() {
    var err error
    nav, err = sitemap.Get(c, r.URL.Path)
    errc <- err
  }()
  go func() {
    var err error
    text, html, err = page.Get(c, r.URL.Path)
    errc <- err
  }()
  go func() {
    var err error
    token, err = backup.GetDropboxToken(c, domain)
    errc <- err
  }()
  go func() {
    var err error
    logout, err = user.LogoutURL(c, "/")
    errc <- err
  }()

  err1, err2, err3, err4 := <-errc, <-errc, <-errc, <-errc

  if err1 != nil {
    web.ErrorPage(w, err1)
    return
  }
  if err2 != nil {
    web.ErrorPage(w, err2)
    return
  }
  if err3 != nil {
    web.ErrorPage(w, err3)
    return
  }
  if err4 != nil {
    web.ErrorPage(w, err4)
    return
  }

  data := struct {
    Text string
    Html template.HTML
    CurrentUrl string
    LogoutUrl string
    Nav []sitemap.NavLink
    User string
    Title string
    Gravatar string
    Dropbox bool
  } {
    text,
    html,
    r.URL.Path,
    logout,
    nav,
    user.Current(c).Email,
    sitemap.GetTitle(r.URL.Path, domain),
    fmt.Sprintf("//www.gravatar.com/avatar/%x", md5.Sum([]byte(user.Current(c).Email))),
    token != "",
  }

  err := homeTemplate.Execute(w, data)
  if err != nil {
    web.ErrorPage(w, err)
    return
  }
}

var navTemplate = template.Must(template.ParseFiles("html/nav.html"))

func save(c appengine.Context, w http.ResponseWriter, r *http.Request) {
  decoder := json.NewDecoder(r.Body)
  var body struct {
    Text string
    Html string
  }

  err := decoder.Decode(&body)
  if err != nil {
    web.ErrorPage(w, err)
    return
  }

  u := user.Current(c)

  err = page.Set(c, r.URL.Path, body.Text, body.Html, u.String())
  if err != nil {
    web.ErrorPage(w, err)
    return
  }

  nav, err := sitemap.Add(c, r.URL.Path)
  if err != nil {
    web.ErrorPage(w, err)
    return
  }

  var navHtml bytes.Buffer
  err = navTemplate.Execute(&navHtml, nav)
  if err != nil {
    web.ErrorPage(w, err)
    return
  }

  response := struct{
    Ok bool
    Nav string
  }{true, navHtml.String()}
  encoder := json.NewEncoder(w)
  encoder.Encode(response)
}

var searchTemplate = template.Must(template.ParseFiles("html/search.html"))

func searchHandler(w http.ResponseWriter, r *http.Request) {
  c := appengine.NewContext(r)
  c, _, done := web.Auth(c, w, r);
  if done == true { return }

  r.ParseForm()
  results, err := sitemap.Search(c, r.Form["q"][0])
  if err != nil {
    web.ErrorPage(w, err)
    return
  }

  var navHtml bytes.Buffer
  err = searchTemplate.Execute(&navHtml, results)
  if err != nil {
    web.ErrorPage(w, err)
    return
  }

  response := struct{
    Ok bool
    Nav string
  }{true, navHtml.String()}

  encoder := json.NewEncoder(w)
  encoder.Encode(response)
}
