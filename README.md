# Doxcart

## Contributing

**Warning**: licensing and copyright ownership of contributions is still TBD.

### Install the Go App Engine SDK

    $ brew install go-app-engine-64
    $ brew link go-app-engine-64

### Fetch the dependency

    $ goapp get github.com/mjibson/appstats

### Create config module

The `config` module contains the secret keys and therefore is not included in the repo. You can copy the sample file. It contains bogus keys, but it should still work unless you're interacting with Dropbox (in which case you should obtain the real keys).

    $ cp config/config.go.sample config/config.go

### Start the JS preprocessing script

    $ npm install
    $ gulp

### Start your engine

    $ goapp serve
