package history

import (
	"time"
	"fmt"
	"crypto/md5"
	"net/http"
	"encoding/json"
	"appengine"
	"appengine/datastore"
	"web"
	"page"
)

type HistoryVersion struct {
	Rev int64 `json:"rev"`
  Path string `json:"path"`
  Date time.Time `json:"date"`
  Author string `json:"author"`
  Gravatar string `json:"gravatar"`
  Deleted bool `json:"deleted"`
}

func Handle(c appengine.Context, w http.ResponseWriter, r *http.Request, path string) {

  q := datastore.NewQuery("PageVersion").Ancestor(page.PageKey(c, path)).Order("-Date")
  var versions []page.PageVersion
  keys, err := q.GetAll(c, &versions)
	if err != nil {
		web.ErrorJson(c, w, err)
		return
	}

	var history []HistoryVersion
	for i, version := range versions {
		history = append(history, HistoryVersion{
			keys[i].IntID(),
			version.Path,
			version.Date,
			version.Author,
			fmt.Sprintf("//www.gravatar.com/avatar/%x", md5.Sum([]byte(version.Author))),
			version.Deleted,
		})
	}

	response := struct{
		Ok bool `json:"ok"`
		Versions []HistoryVersion `json:"versions"`
	}{true, history}
	encoder := json.NewEncoder(w)
	encoder.Encode(response)
}
