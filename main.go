package main

import (
	"runtime"
	"fmt"
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

func root(w http.ResponseWriter, r *http.Request) {
	if r.Method == "PUT" {
		save(w, r)
		return
	}

	c := appengine.NewContext(r)
	nav, err := sitemap.Get(c)
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
	} {text, html, r.URL.Path, logout, nav}

	err = pageTemplate.Execute(w, data)
	if err != nil {
		errorPage(w, err)
		return
	}
}

var pageTemplate = template.Must(template.ParseFiles("html/index.html"))

func save(w http.ResponseWriter, r *http.Request) {
	decoder := json.NewDecoder(r.Body)
	var body struct {
		Content string
	}

	err := decoder.Decode(&body)
	if err != nil {
		errorPage(w, err)
		return
	}

	c := appengine.NewContext(r)
	u := user.Current(c)

	_, html, err := page.Set(c, r.URL.Path, body.Content, u.String())
	if (err != nil) {
		errorPage(w, err)
		return
	}

	err = sitemap.Add(c, r.URL.Path)
	if (err != nil) {
		errorPage(w, err)
		return
	}

	body.Content = html;
	encoder := json.NewEncoder(w)
	encoder.Encode(body)
}
