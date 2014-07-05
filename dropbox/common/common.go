package dropboxCommon

import (
	"strings"
	"appengine"
	"appengine/datastore"
	"cache"
)

const PathPrefix = "/Doxcart"

type ServiceToken struct {
  User string
  Service string
  Token string
  Id string
	Cursor string
}

func SetToken(c appengine.Context, email string, accessToken string, uid string, cursor string) error {
  serviceToken := ServiceToken{
    email,
    "dropbox",
    accessToken,
    uid,
		cursor,
  }
  c.Infof("Obj %v", serviceToken)
  domain := strings.Split(email, "@")[1]

  gc, err := appengine.Namespace(c, "")
  if err != nil { return err }
  _, err = datastore.Put(gc, datastore.NewKey(gc, "ServiceToken", domain + "/dropbox", 0, nil), &serviceToken)

  if err != nil { return err }
  err = cache.Set(c, "dropbox:" + domain, []byte(accessToken))
  return err
}

func GetToken(c appengine.Context, domain string) (string, error) {
  accessToken, err := cache.Get(c, "dropbox:" + domain)
  if err != nil { return "", err }
  if accessToken != nil { return string(accessToken), nil }

  serviceToken := ServiceToken{}
  gc, err := appengine.Namespace(c, "")
  if err != nil { return "", err }
  err = datastore.Get(gc, datastore.NewKey(gc, "ServiceToken", domain + "/dropbox", 0, nil), &serviceToken)

  if err == datastore.ErrNoSuchEntity {
    err = cache.Set(c, "dropbox:" + domain, []byte(""))
    return "", nil
  }
  if err != nil { return "", err }
  err = cache.Set(c, "dropbox:" + domain, []byte(serviceToken.Token))
  return serviceToken.Token, nil
}

