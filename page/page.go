package page

import (
  "html/template"
  "time"
  "appengine"
  "appengine/datastore"
  "appengine/memcache"
  "appengine/search"
)

type PageVersion struct {
  Path string
  Content string `datastore:",noindex"`
  Html search.HTML `datastore:",noindex"`
  Date time.Time
  Author string
}

func pageKey(c appengine.Context, url string) *datastore.Key {
  return datastore.NewKey(c, "PageVersion", url, 0, nil)
}

func getLatestVersion(c appengine.Context, path string) (*PageVersion, error) {

  c.Infof("Fetching latest version: %v", path)
  q := datastore.NewQuery("PageVersion").Ancestor(pageKey(c, path)).Order("-Date").Limit(1)
  versions := make([]PageVersion, 0, 1)

  _, err := q.GetAll(c, &versions)
  if err != nil {
    return nil, nil
  }

  if len(versions) == 0 {
    return &PageVersion{
      Content: "Type using Markdown...",
      Html: search.HTML("Empty page. Click edit to create it."),
      Date: time.Now(),
    }, nil
  } else {
    return &versions[0], nil
  }
}

func cachePageContent(c appengine.Context, path string, text string, html string) error {
  textKey := "text:" + path
  htmlKey := "html:" + path
  contentItem := &memcache.Item{
    Key: textKey,
    Value: []byte(text),
  }
  htmlItem := &memcache.Item{
    Key: htmlKey,
    Value: []byte(html),
  }
  return memcache.SetMulti(c, []*memcache.Item{contentItem, htmlItem})
}

func Get(c appengine.Context, path string) (string, template.HTML, error) {
  textKey := "text:" + path
  htmlKey := "html:" + path
  cached, err := memcache.GetMulti(c, []string{textKey, htmlKey});
  if err != nil && err != memcache.ErrCacheMiss {
    return "", template.HTML(""), err
  }

  if (cached[textKey] != nil) && (cached[htmlKey] != nil) {
    c.Infof("Cache hit: %v, %v", textKey, htmlKey)
    return string(cached[textKey].Value), template.HTML(cached[htmlKey].Value), nil
  }

  c.Infof("Cache miss: %v, %v", textKey, htmlKey)

  version, err := getLatestVersion(c, path)
  if err != nil {
    return "", template.HTML(""), err
  }

  cachePageContent(c, path, version.Content, string(version.Html))
  return version.Content, template.HTML(string(version.Html)), nil
}

func Set(c appengine.Context, path string, text string, html string, author string) error {
  version := PageVersion{
    Path: path,
    Content: text,
    Html: search.HTML(html),
    Date: time.Now(),
    Author: author,
  }

  key := datastore.NewIncompleteKey(c, "PageVersion", pageKey(c, path))
  _, err := datastore.Put(c, key, &version)
  if err != nil { return err }

  cachePageContent(c, path, text, html)

  index, err := search.Open("pages")
  if err != nil { return err }
  c.Infof("Indexing: %s", path)
  _, err = index.Put(c, path, &version)
  if err != nil { return err }

  return nil
}
