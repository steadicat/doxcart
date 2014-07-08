package pubsub

import (
	"strings"
	"appengine"
	"appengine/channel"
	"cache"
)

func getSubs(c appengine.Context, channelName string) ([]string, error) {
	subsString, err := cache.Get(c, "channel:" + channelName)
	if err != nil {
		return nil, err
	}
	if subsString != nil {
		return strings.Split(string(subsString), ","), nil
	} else {
		return []string{}, nil
	}
}

func setSubs(c appengine.Context, channelName string, subs []string) error {
	subsString := strings.Join(subs, ",")
	return cache.Set(c, "channel:" + channelName, []byte(subsString))
}

func GetToken(c appengine.Context, client string) (string, error) {
	return channel.Create(c, client)
}

func Sub(c appengine.Context, client string, channelName string) error {
	subs, err := getSubs(c, channelName)
	if err != nil { return err }
	subs = append(subs, client)
	return setSubs(c, channelName, subs)
}

func Pub(c appengine.Context, channelName string, value interface{}) error {
	subs, err := getSubs(c, channelName)
	if err != nil { return err }
	for _, client := range subs {
		err = channel.SendJSON(c, client, value)
		if err != nil {
			c.Warningf("Error sending JSON to client %v: %v", client, value)
		}
	}
	return nil
}
