package cache

import (
  "appengine"
  "appengine/memcache"
  "encoding/json"
)

func CreateGetter(key string, fetch func(appengine.Context) (interface{}, error)) func(appengine.Context, *interface{}) error {
  return func(c appengine.Context, dest *interface{}) error {
    cache, err := getCache(c, key)
    if (err != nil || cache == nil) {
      if (err != memcache.ErrCacheMiss) { return err }
      c.Infof("Cache miss: %v", key)
      res, err := fetch(c)
      if (err != nil) { return err }
      str, err := json.Marshal(res)
      if (err != nil) { return err }
      c.Infof("Cacheing: %v, %v", key, string(str))
      err = setCache(c, key, str)
      if err != nil { return err }
      return nil
    } else {
      c.Infof("Cache hit: %v, %v", key, string(cache))
      err = json.Unmarshal(cache, dest)
      if err != nil { return err }
      return nil
    }
  }
}

func getCache(c appengine.Context, key string) ([]byte, error) {
  cache, err := memcache.Get(c, key)
  if (err != nil) {
    return []byte{}, err
  }
  return cache.Value, nil
}

func setCache(c appengine.Context, key string, value []byte) error {
  return memcache.Set(c, &memcache.Item{
    Key: key,
    Value: value,
  })
}