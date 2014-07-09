package page

import (
  "html/template"
  "time"
	"strconv"
  "appengine"
  "appengine/datastore"
  "appengine/memcache"
  "appengine/search"
  "appengine/delay"
  "dropbox/write"
  "web"
)

type PageVersion struct {
  Path string `json:"path"`
  Content string `json:"-" datastore:",noindex"`
  Html search.HTML `json:"-" datastore:",noindex"`
  Date time.Time `json:"date"`
  Author string `json:"author"`
  Deleted bool `json:"deleted"`
}

type IndexedPage struct {
  Path string
  Content string `datastore:",noindex"`
  Html search.HTML `datastore:",noindex"`
  Date time.Time
  Author string
}

func PageKey(c appengine.Context, url string) *datastore.Key {
  return datastore.NewKey(c, "PageVersion", url, 0, nil)
}

func getVersion(c appengine.Context, path string, rev string) (*PageVersion, error) {

	if rev != "" {
		id, err := strconv.ParseInt(rev, 10, 64)
		c.Infof("Fetching version %v of %v", id, path)
		if err != nil {	return nil, err	}
		version := PageVersion{}
		err = datastore.Get(c, datastore.NewKey(c, "PageVersion", "", id, PageKey(c, path)), &version)
		if err != nil {	return nil, err	}
		return &version, nil
	}

	c.Infof("Fetching latest version: %v", path)
	q := datastore.NewQuery("PageVersion").Ancestor(PageKey(c, path)).Order("-Date").Limit(1)
	versions := make([]PageVersion, 0, 1)

	_, err := q.GetAll(c, &versions)
	if err != nil {	return nil, err	}

  if len(versions) == 0 || versions[0].Deleted {
    return &PageVersion{
      Content: "New page. Click edit to create it.",
      Html: search.HTML("New page. Click edit to create it."),
      Date: time.Now(),
    }, nil
  } else {
    return &versions[0], nil
  }
}

func cachePageContent(c appengine.Context, path string, rev string, text string, html string) error {
	revSuffix := ""
	if rev != "" {
		revSuffix = ":" + rev
	}
  textKey := "text:" + path + revSuffix
  htmlKey := "html:" + path + revSuffix
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

func Get(c appengine.Context, path string, rev string) (string, template.HTML, error) {
	revSuffix := ""
	if rev != "" {
		revSuffix = ":" + rev
	}
  textKey := "text:" + path + revSuffix
  htmlKey := "html:" + path + revSuffix
  cached, err := memcache.GetMulti(c, []string{textKey, htmlKey});
  if err != nil && err != memcache.ErrCacheMiss {
    return "", template.HTML(""), err
  }

  if (cached[textKey] != nil) && (cached[htmlKey] != nil) {
    c.Infof("Cache hit: %v, %v", textKey, htmlKey)
    return string(cached[textKey].Value), template.HTML(cached[htmlKey].Value), nil
  }

  c.Infof("Cache miss: %v, %v", textKey, htmlKey)

  version, err := getVersion(c, path, rev)
  if err != nil {
    return "", template.HTML(""), err
  }

  domain := web.GetDomain(c)
  afterGet.Call(c, domain, path, version.Content, string(version.Html))

  return version.Content, template.HTML(string(version.Html)), nil
}

var afterGet = delay.Func("AfterPageGet", func(c appengine.Context, domain string, path string, rev string, text string, html string) {
  c, err := appengine.Namespace(c, domain)
  if err != nil {
    c.Warningf("Error setting namespace %v: %v", domain, err.Error())
  }
  err = cachePageContent(c, path, rev, text, html)
  if err != nil {
    c.Warningf("Error caching page %v: %v", path, err.Error())
  }
})

func Set(c appengine.Context, domain string, path string, text string, html string, author string, deleted bool, fromDropbox bool) error {
  version := PageVersion{
    Path: path,
    Content: text,
    Html: search.HTML(html),
    Date: time.Now(),
    Author: author,
		Deleted: deleted,
  }

  key := datastore.NewIncompleteKey(c, "PageVersion", PageKey(c, path))
  _, err := datastore.Put(c, key, &version)
  if err != nil { return err }

  afterSet.Call(c, domain, version, fromDropbox)

  return nil
}

var afterSet = delay.Func("AfterPageSet", func(c appengine.Context, domain string, version PageVersion, fromDropbox bool) {
  c, err := appengine.Namespace(c, domain)
  if err != nil {
    c.Warningf("Error setting namespace %v: %v", domain, err.Error())
		return
  }

	if version.Deleted {
		version.Content = "New page. Click edit to create it."
		version.Html = search.HTML("New page. Click edit to create it.")
	}

  err = cachePageContent(c, version.Path, "", version.Content, string(version.Html))
  if err != nil {
    c.Warningf("Error caching page %v: %v", version.Path, err.Error())
  }

  index, err := search.Open("pages")
  if err != nil {
    c.Warningf("Error opening search index: %v", err.Error())
		return
  }

	if version.Deleted {
		err = index.Delete(c, version.Path)
		if err != nil {
			c.Warningf("Error removing %v from index: %v", version.Path, err.Error())
		}
	} else {
		c.Infof("Indexing %s", version.Path)
		indexed := IndexedPage{
			Path: version.Path,
			Content: version.Content,
			Html: version.Html,
			Date: version.Date,
			Author: version.Author,
		}
		_, err = index.Put(c, version.Path, &indexed)
		if err != nil {
			c.Warningf("Error indexing %v: %v", version.Path, err.Error())
		}
	}

	if !fromDropbox {
		c.Infof("Saving to Dropbox: %s", version.Path)
		err = dropboxWrite.SaveFile(c, domain, version.Path, version.Content)
		if err != nil {
			c.Warningf("Error saving %v to dropbox: %v", version.Path, err.Error())
		}
	}
})

