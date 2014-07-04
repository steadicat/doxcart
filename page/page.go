package page

import (
  "html/template"
  "time"
  "appengine"
  "appengine/datastore"
  "appengine/memcache"
  "appengine/search"
  "appengine/delay"
  "dropbox"
  "web"
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

  domain := web.GetDomain(c)
  afterGet.Call(c, domain, path, version.Content, string(version.Html))

  return version.Content, template.HTML(string(version.Html)), nil
}

var afterGet = delay.Func("AfterPageGet", func(c appengine.Context, domain string, path string, text string, html string) {
  c, err := appengine.Namespace(c, domain)
  if err != nil {
    c.Warningf("Error setting namespace %v: %v", domain, err.Error())
  }
  err = cachePageContent(c, path, text, html)
  if err != nil {
    c.Warningf("Error caching page %v: %v", path, err.Error())
  }
})

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

  domain := web.GetDomain(c)
  afterSet.Call(c, domain, version)

  return nil
}

var afterSet = delay.Func("AfterPageSet", func(c appengine.Context, domain string, version PageVersion) {
  c, err := appengine.Namespace(c, domain)
  if err != nil {
    c.Warningf("Error setting namespace %v: %v", domain, err.Error())
  }

  err = cachePageContent(c, version.Path, version.Content, string(version.Html))
  if err != nil {
    c.Warningf("Error caching page %v: %v", version.Path, err.Error())
  }

  index, err := search.Open("pages")
  if err != nil {
    c.Warningf("Error opening search index: %v", err.Error())
  }

  c.Infof("Indexing %s", version.Path)
  _, err = index.Put(c, version.Path, &version)
  if err != nil {
    c.Warningf("Error indexing %v: %v", version.Path, err.Error())
  }

  c.Infof("Saving to Dropbox: %s", version.Path)
  err = dropbox.SaveFile(c, domain, version.Path, version.Content)
  if err != nil {
    c.Warningf("Error saving %v to dropbox: %v", version.Path, err.Error())
  }
})

