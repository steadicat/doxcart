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
)

func init() {
  http.HandleFunc("/favicon.ico", web.NotFound)
  http.HandleFunc("/robots.txt", web.NotFound)
  http.HandleFunc("/s", searchHandler)
  http.HandleFunc("/_/dropbox", backup.DropboxHandler)
  http.HandleFunc("/_/dropbox/oauth", backup.DropboxOauthHandler)
  http.HandleFunc("/_/dropbox/disconnect", backup.DropboxDisconnectHandler)
  http.HandleFunc("/", root)
}

var homeTemplate = template.Must(template.ParseFiles("html/index.html"))

func root(w http.ResponseWriter, r *http.Request) {
  c, domain, done := web.Auth(w, r);
  if done == true { return }

  if r.Method == "PUT" {
    save(c, w, r)
    return
  }

  nav, err := sitemap.Get(c, r.URL.Path)
  if err != nil {
    web.ErrorPage(w, err)
    return
  }

  text, html, err := page.Get(c, r.URL.Path)
  if err != nil {
    web.ErrorPage(w, err)
    return
  }

  token, err := backup.GetDropboxToken(c)
  if err != nil {
    web.ErrorPage(w, err)
    return
  }

  logout, _ := user.LogoutURL(c, "/")

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

  err = homeTemplate.Execute(w, data)
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
  c, _, done := web.Auth(w, r);
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
