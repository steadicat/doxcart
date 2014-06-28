package sitemap

import (
  "cache"
  "appengine"
  "appengine/memcache"
  "appengine/datastore"
)

type Page struct {
  Path string
}

type SiteMap struct {
  Paths []string
}

const key = "sitemap"

/*
func Get(c appengine.Context) ([]string, error) {
  cache, err := getCache(c)
  var paths []string
  if (err != nil) {
    if (err != memcache.ErrCacheMiss) {
      return nil, err
    }
    paths, err = fetch(c)
    if (err != nil) {
      return nil, err
    }
    err = setCache(c, strings.Join(paths, ","))
    if err != nil {
      return nil, err
    }
  } else {
    paths = strings.Split(cache, ",")
  }
  return paths, nil
}
*/


var getter func(appengine.Context, *interface{}) error = cache.CreateGetter(key, fetch)

func Get(c appengine.Context) ([]string, error) {
  siteMap := make(map[string][]string)
  dest := interface{}(siteMap)
  err := getter(c, &dest)
  if err != nil { return nil, err }
  resMap := dest.(map[string]interface{})
  c.Infof("Returning list of paths: %v", dest)
  items := resMap["Paths"].([]interface{})
  paths := []string{}
  for _, item := range items {
    paths = append(paths, item.(string))
  }
  return paths, nil
}


func Add(c appengine.Context, path string) error {
  p := Page{path}
  _, err := datastore.Put(c, datastore.NewKey(c, "Page", path, 0, nil), &p)
  if err != nil {
    return err
  }
  c.Infof("Cache cleared: %v", key)
  err = memcache.Delete(c, key)
  if err != nil && err != memcache.ErrCacheMiss {
    return err
  }
  return nil
}

func fetch(c appengine.Context) (interface{}, error) {
  q := datastore.NewQuery("Page")
  var pages []Page
  _, err := q.GetAll(c, &pages)
  if (err != nil) { return nil, err }
  var paths []string
  for _, page := range pages {
    paths = append(paths, page.Path)
  }
  c.Infof("Fetched list of paths: %v", paths)
  return interface{}(SiteMap{paths}), nil
}

func getCache(c appengine.Context) (string, error) {
  cache, err := memcache.Get(c, key)
  if (err != nil) {
    return "", err
  }
  return string(cache.Value), nil
}

func setCache(c appengine.Context, paths string) error {
  item := &memcache.Item{
    Key: key,
    Value: []byte(paths),
  }
  return memcache.Set(c, item)
}
