package sitemap

import (
  "sort"
  "cache"
  "strings"
  "appengine"
  "appengine/datastore"
  "appengine/search"
  "appengine/delay"
  "page"
  "web"
)

type Page struct {
  Path string
}

type NavLink struct {
  Path string `json:"path"`
  Title string `json:"title"`
  Active bool `json:"-"`
  Depth int `json:"depth"`
}

const key = "sitemap"

func formatTitle(bit string) string {
  bit = strings.Join(strings.Split(bit, "_"), " ")
  bit = strings.Join(strings.Split(bit, "-"), " ")
  bit = strings.Title(bit)
  bit = strings.Replace(bit, "Ios", "iOS", -1)
  bit = strings.Replace(bit, "Css", "CSS", -1)
  bit = strings.Replace(bit, " And ", " and ", -1)
  bit = strings.Replace(bit, " A ", " a ", -1)
  bit = strings.Replace(bit, "Javascript", "JavaScript", -1)
  return bit
}

func pathToNavLink(path string, currentPath string) NavLink {
  if path == "" {
    path = "/"
  }
  bits := strings.Split(path, "/")
  depth := len(bits)
  title := bits[len(bits) - 1]
  if path == "/" {
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
    afterGet.Call(c, web.GetDomain(c), key, strings.Join(paths, ","))
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

var afterGet = delay.Func("AfterNavGet", func(c appengine.Context, domain string, key string, paths string) {
  c, err := appengine.Namespace(c, domain)
  if err != nil {
    c.Warningf("Error setting namespace %v: %v", domain, err.Error())
  }
  err = cache.Set(c, key, []byte(paths))
  if err != nil {
    c.Warningf("Error caching sitemap: %v", err.Error())
  }
})

func GetTitle(path string, domain string) string {
  if path == "/" {
    return domain
  }
  bits := strings.Split(path, "/")
  title := bits[len(bits) - 1]
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

func Add(c appengine.Context, domain string, path string) ([]NavLink, error) {
  p := Page{path}
  _, err := datastore.Put(c, datastore.NewKey(c, "Page", path, 0, nil), &p)
  if err != nil { return []NavLink{}, err }
  nav, err := Get(c, path)
  if err != nil { return []NavLink{}, err }

  navLink := pathToNavLink(path, path)

  if !pathInNav(path, nav) {
    nav = append(nav, navLink)
  }
  sort.Sort(ByPath(nav))

  paths := []string{}
  for _, path := range nav {
    paths = append(paths, path.Path)
  }
  afterGet.Call(c, domain, key, strings.Join(paths, ","))

  return nav, nil
}

func Remove(c appengine.Context, domain string, path string) ([]NavLink, error) {
  err := datastore.Delete(c, datastore.NewKey(c, "Page", path, 0, nil))
  if err != nil { return []NavLink{}, err }
  nav, err := Get(c, path)
  if err != nil { return []NavLink{}, err }

  paths := []string{}
  for _, p := range nav {
    if p.Path != path {
      paths = append(paths, p.Path)
    }
  }
  afterGet.Call(c, domain, key, strings.Join(paths, ","))

  return nav, nil
}

func fetch(c appengine.Context) ([]string, error) {
  q := datastore.NewQuery("Page")
  var pages []Page
  _, err := q.GetAll(c, &pages)
  if err != nil { return nil, err }
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
