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

type NavLink struct {
  Path string
  Title string
  Active bool
  Depth int
}

const key = "sitemap"

func formatTitle(bit string) string {
  bit = strings.Join(strings.Split(bit, "_"), " ")
  bit = strings.Join(strings.Split(bit, "-"), " ")
  return strings.Title(bit)
}

func pathToNavLink(path string, currentPath string) NavLink {
  bits := strings.Split(path, "/")
  depth := len(bits)
  title := bits[len(bits) - 1]
  if title == "" {
    title = "home"
    depth--
  }
  return NavLink{
    path,
    formatTitle(title),
    path == currentPath,
    depth * 10,
  }
}

func Get(c appengine.Context, currentPath string) ([]NavLink, error) {
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

  nav := []NavLink{}
  for _, path := range paths {
    nav = append(nav, pathToNavLink(path, currentPath))
  }
  return nav, nil
}

func GetTitle(path string, domain string) string {
  bits := strings.Split(path, "/")
  title := bits[len(bits) - 1]
  if title == "" {
    return domain
  }
  return formatTitle(title)
}

func Add(c appengine.Context, path string) ([]NavLink, error) {
  p := Page{path}
  _, err := datastore.Put(c, datastore.NewKey(c, "Page", path, 0, nil), &p)
  if err != nil { return []NavLink{}, err }
  nav, err := Get(c, path)
  if err != nil { return []NavLink{}, err }
  err = cache.Clear(c, key)
  if err != nil { return []NavLink{}, err }
  if (path != "/") {
    nav = append(nav, pathToNavLink(path, path))
  }
  return nav, nil
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
