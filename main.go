package main

import (
	"appengine"
	"appengine/user"
	"crypto/md5"
	"dropbox/common"
	"dropbox/read"
	"dropbox/write"
	"encoding/json"
	"fmt"
	"github.com/mjibson/appstats"
	"history"
	"html/template"
	"net/http"
	"page"
	"pubsub"
	"sitemap"
	"strings"
	"web"
)

func init() {
	http.HandleFunc("/favicon.ico", web.NotFound)
	http.HandleFunc("/robots.txt", web.NotFound)
	dropboxRead.Init()
	dropboxWrite.Init()
	http.Handle("/s", appstats.NewHandler(searchHandler))
	http.Handle("/", appstats.NewHandler(root))
}

var homeTemplate = template.Must(template.ParseFiles("html/index.html"))

func root(c appengine.Context, w http.ResponseWriter, r *http.Request) {
	c, domain, done := web.Auth(c, w, r)
	if done == true {
		return
	}

	if r.Method == "PUT" {
		save(c, w, r)
		return
	}

	path := r.URL.Path
	if path != "/" {
		path = strings.TrimRight(r.URL.Path, "/")
		path = strings.ToLower(path)
	}
	if path != r.URL.Path {
		http.Redirect(w, r, path, http.StatusMovedPermanently)
		return
	}

	w.Header().Set("Vary", "Accept")

	if r.Header.Get("Accept") == "application/json" {
		if strings.HasSuffix(r.URL.String(), "?history") {
			history.Handle(c, w, r, path)
			return
		}

		r.ParseForm()
		text, html, err := page.Get(c, path, r.Form.Get("rev"))
		if err != nil {
			web.ErrorJson(c, w, err)
			return
		}
		response := struct {
			Ok    bool   `json:"ok"`
			Text  string `json:"text"`
			Html  string `json:"html"`
			Title string `json:"title"`
		}{true, text, string(html), sitemap.GetTitle(path, domain)}
		encoder := json.NewEncoder(w)
		encoder.Encode(response)
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
		nav, err = sitemap.Get(c, path)
		errc <- err
	}()
	go func() {
		var err error
		r.ParseForm()
		text, html, err = page.Get(c, path, r.Form.Get("rev"))
		errc <- err
	}()
	go func() {
		var err error
		token, err = dropboxCommon.GetToken(c, domain)
		errc <- err
	}()
	go func() {
		var err error
		logout, err = user.LogoutURL(c, "/")
		errc <- err
	}()

	err1, err2, err3, err4 := <-errc, <-errc, <-errc, <-errc

	if err1 != nil {
		web.ErrorPage(c, w, err1)
		return
	}
	if err2 != nil {
		web.ErrorPage(c, w, err2)
		return
	}
	if err3 != nil {
		web.ErrorPage(c, w, err3)
		return
	}
	if err4 != nil {
		web.ErrorPage(c, w, err4)
		return
	}

	email := user.Current(c).Email
	channelToken, err := pubsub.GetToken(c, email)
	if err != nil {
		c.Warningf("Error creating channel for user: %v", email)
		channelToken = ""
	}

	err = pubsub.Sub(c, email, "page:"+path)
	if err != nil {
		c.Warningf("Error subscribing to channel page:%v", path)
	}

	type Data struct {
		Title     string            `json:"title"`
		Text      string            `json:"text"`
		Path      string            `json:"path"`
		LogoutUrl string            `json:"logoutUrl"`
		Nav       []sitemap.NavLink `json:"nav"`
		User      string            `json:"user"`
		Gravatar  string            `json:"gravatar"`
		Dropbox   bool              `json:"dropbox"`
		Token     string            `json:"token"`
	}

	data := struct {
		Title string
		Html  template.HTML
		Dev   bool
		Data  Data
	}{
		sitemap.GetTitle(r.URL.Path, domain),
		html,
		appengine.IsDevAppServer(),
		Data{
			sitemap.GetTitle(r.URL.Path, domain),
			text,
			path,
			logout,
			nav,
			user.Current(c).Email,
			fmt.Sprintf("//www.gravatar.com/avatar/%x", md5.Sum([]byte(user.Current(c).Email))),
			token != "",
			channelToken,
		},
	}

	err = homeTemplate.Execute(w, data)
	if err != nil {
		web.ErrorPage(c, w, err)
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
		web.ErrorPage(c, w, err)
		return
	}

	u := user.Current(c)
	domain := web.GetDomain(c)
	var nav []sitemap.NavLink

	errc := make(chan error)
	go func() {
		err := page.Set(c, domain, r.URL.Path, body.Text, body.Html, u.Email, false, false)
		errc <- err
	}()
	go func() {
		var err error
		nav, err = sitemap.Add(c, domain, r.URL.Path)
		errc <- err
	}()
	err1, err2 := <-errc, <-errc

	if err1 != nil {
		web.ErrorPage(c, w, err1)
		return
	}
	if err2 != nil {
		web.ErrorPage(c, w, err2)
		return
	}

	type Info struct {
		Path   string `json:"path"`
		Text   string `json:"text"`
		Author string `json:"author"`
	}
	c.Infof("Publishing pageUpdate: %v", r.URL.Path)
	err = pubsub.Pub(c, "page:"+r.URL.Path, struct {
		Event string `json:"event"`
		Info  Info   `json:"info"`
	}{"pageUpdate", Info{
		r.URL.Path,
		body.Text,
		u.Email,
	}})
	if err != nil {
		c.Warningf("Error publishing to channel page:%v", r.URL.Path)
	}

	response := struct {
		Ok  bool              `json:"ok"`
		Nav []sitemap.NavLink `json:"nav"`
	}{true, nav}
	encoder := json.NewEncoder(w)
	encoder.Encode(response)
}

func searchHandler(c appengine.Context, w http.ResponseWriter, r *http.Request) {
	c, _, done := web.Auth(c, w, r)
	if done == true {
		return
	}

	r.ParseForm()
	results, err := sitemap.Search(c, r.Form["q"][0])
	if err != nil {
		web.ErrorPage(c, w, err)
		return
	}

	encoder := json.NewEncoder(w)
	encoder.Encode(results)
}
