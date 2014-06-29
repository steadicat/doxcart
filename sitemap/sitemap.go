package sitemap

import (
  "cache"
  "strings"
  "appengine"
  "appengine/datastore"
)

type Page struct {
  Path string
}

const key = "sitemap"

func Get(c appengine.Context) ([]string, error) {
  cached, err := cache.Get(c, key)
  if err != nil { return nil, err }
  var paths []string
  if cached == nil {
    paths, err = fetch(c)
    if err != nil { return nil, err }
    err = cache.Set(c, key, []byte(strings.Join(paths, ",")))
    if err != nil { return nil, err }
  } else {
    paths = strings.Split(string(cached), ",")
  }
  return paths, nil
}

func Add(c appengine.Context, path string) error {
  p := Page{path}
  _, err := datastore.Put(c, datastore.NewKey(c, "Page", path, 0, nil), &p)
  if err != nil { return err }
  return cache.Clear(c, key)
}

func fetch(c appengine.Context) ([]string, error) {
  q := datastore.NewQuery("Page")
  var pages []Page
  _, err := q.GetAll(c, &pages)
  if (err != nil) { return nil, err }
  var paths []string
  for _, page := range pages {
    paths = append(paths, page.Path)
  }
  c.Infof("Fetched list of paths: %v", paths)
  return paths, nil
}
