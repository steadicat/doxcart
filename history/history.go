package history

import (
	"net/http"
	"encoding/json"
	"appengine"
	"appengine/datastore"
	"web"
	"page"
)

func Handle(c appengine.Context, w http.ResponseWriter, r *http.Request, path string) {

  q := datastore.NewQuery("PageVersion").Ancestor(page.PageKey(c, path)).Order("-Date")
  var versions []page.PageVersion
  _, err := q.GetAll(c, &versions)
	if err != nil {
		web.ErrorJson(c, w, err)
		return
	}

	response := struct{
		Ok bool `json:"ok"`
		Versions []page.PageVersion `json:"versions"`
	}{true, versions}
	encoder := json.NewEncoder(w)
	encoder.Encode(response)
}
