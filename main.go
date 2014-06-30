package main

import (
	"runtime"
	"fmt"
	"strings"
	"html/template"
	"net/http"
	"encoding/json"
	"appengine"
	"appengine/user"
	"sitemap"
	"page"
)

func init() {
	http.HandleFunc("/favicon.ico", notFound)
	http.HandleFunc("/robots.txt", notFound)
	http.HandleFunc("/", root)
}

func notFound(w http.ResponseWriter, r *http.Request) {
  http.Error(w, "Not found", 404)
}

func errorPage(w http.ResponseWriter, err error) {
	trace := make([]byte, 1024)
	count := runtime.Stack(trace, true)
  http.Error(w, err.Error(), http.StatusInternalServerError)
	fmt.Fprintf(w, "Recover from panic: %s\n", err)
	fmt.Fprintf(w, "Stack of %d bytes: %s\n", count, trace)
}

var loginTemplate = template.Must(template.ParseFiles("html/login.html"))

func loginPage(w http.ResponseWriter, r *http.Request) {
	c := appengine.NewContext(r)

 	loginUrl, _ := user.LoginURL(c, r.URL.Path)
 	err := loginTemplate.Execute(w, loginUrl)
 	if err != nil {
 		errorPage(w, err)
 		return
 	}
}

var homeTemplate = template.Must(template.ParseFiles("html/index.html"))

func root(w http.ResponseWriter, r *http.Request) {
	c := appengine.NewContext(r)

	if user.Current(c) == nil {
		loginPage(w, r)
		return
	}

	domain := strings.Split(user.Current(c).Email, "@")[1]

	c, err := appengine.Namespace(c, domain)
	if (err != nil) {
		errorPage(w, err)
		return
	}
	c.Infof("Using namespace: %v", domain)

	if r.Method == "PUT" {
		save(c, w, r)
		return
	}

	nav, err := sitemap.Get(c, r.URL.Path)
	if (err != nil) {
		errorPage(w, err)
		return
	}

	text, html, err := page.Get(c, r.URL.Path)
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
		Nav []sitemap.NavLink
		User string
		Title string
	} {text, html, r.URL.Path, logout, nav, user.Current(c).String(), sitemap.GetTitle(r.URL.Path, domain)}

	err = homeTemplate.Execute(w, data)
	if err != nil {
		errorPage(w, err)
		return
	}
}

func save(c appengine.Context, w http.ResponseWriter, r *http.Request) {
	decoder := json.NewDecoder(r.Body)
	var body struct {
		Text string
		Html string
	}

	err := decoder.Decode(&body)
	if err != nil {
		errorPage(w, err)
		return
	}

	u := user.Current(c)

	err = page.Set(c, r.URL.Path, body.Text, body.Html, u.String())
	if (err != nil) {
		errorPage(w, err)
		return
	}

	err = sitemap.Add(c, r.URL.Path)
	if (err != nil) {
		errorPage(w, err)
		return
	}

	response := struct{ok bool}{true}
	encoder := json.NewEncoder(w)
	encoder.Encode(response)
}
