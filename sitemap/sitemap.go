package sitemap

import (
  "sort"
  "cache"
  "strings"
  "appengine"
  "appengine/datastore"
  "appengine/search"
  "page"
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
  return strings.Replace(strings.Title(bit), "Ios", "iOS", -1)
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
    (depth - 1) * 10,
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

func pathInNav(path string, nav []NavLink) bool {
  for _, n := range nav {
    if n.Path == path {
      return true
    }
  }
  return false
}

type ByPath []NavLink

func (a ByPath) Len() int           { return len(a) }
func (a ByPath) Swap(i, j int)      { a[i], a[j] = a[j], a[i] }
func (a ByPath) Less(i, j int) bool { return a[i].Path < a[j].Path }

func Add(c appengine.Context, path string) ([]NavLink, error) {
  p := Page{path}
  _, err := datastore.Put(c, datastore.NewKey(c, "Page", path, 0, nil), &p)
  if err != nil { return []NavLink{}, err }
  nav, err := Get(c, path)
  if err != nil { return []NavLink{}, err }
  err = cache.Clear(c, key)
  if err != nil { return []NavLink{}, err }

  if !pathInNav(path, nav) {
    nav = append(nav, pathToNavLink(path, path))
  }
  sort.Sort(ByPath(nav))
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

func Search(c appengine.Context, query string) ([]NavLink, error) {
  index, err := search.Open("pages")
  if err != nil { return []NavLink{}, err }

  var paths []string

  for t := index.Search(c, query, nil); ; {
    var version page.PageVersion
    id, err := t.Next(&version)
    if err == search.Done {
      break
    }
    paths = append(paths, id)
    if err != nil { return []NavLink{}, err }
  }

  nav := []NavLink{}
  for _, path := range paths {
    nav = append(nav, pathToNavLink(path, "_"))
  }
  return nav, nil
}
