package cache

import (
	"appengine"
	"appengine/memcache"
)

func Get(c appengine.Context, key string) ([]byte, error) {
	cache, err := memcache.Get(c, key)
	if err != nil && err != memcache.ErrCacheMiss {
		return nil, err
	}
	if err != nil || cache == nil {
		c.Infof("Cache miss: %v", key)
		return nil, nil
	}
	c.Infof("Cache hit: %v, %v", key, string(cache.Value))
	return cache.Value, nil
}

func Set(c appengine.Context, key string, value []byte) error {
	c.Infof("Caching: %v, %v", key, string(value))
	return memcache.Set(c, &memcache.Item{
		Key:   key,
		Value: value,
	})
}

func Clear(c appengine.Context, key string) error {
	c.Infof("Clearing cache: %v", key)
	err := memcache.Delete(c, key)
	if err != nil && err != memcache.ErrCacheMiss {
		return err
	}
	return nil
}
