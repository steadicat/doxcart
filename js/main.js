/** @jsx React.DOM **/
var ajax = require('./ajax');
var marked = require('./marked');
var cookie = require('./cookie');
var Home = require('./ui/Home');
var Data = require('./ui/Data');
var Dispatcher = require('./ui/Dispatcher');
//require('../css/main.css');
var ReactBatchingStrategy = require('./batching');
var ReactInjection = require('react/lib/ReactInjection');

ReactInjection.Updates.injectBatchingStrategy(ReactBatchingStrategy);

window.history.pushState && document.body.addEventListener('click', function(e) {
  if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
  if (e.target.href) {
    var url = new URL(e.target.href);
    if ((url.hostname == window.location.hostname) &&
        (url.pathname[1] !== '_')) {
      e.preventDefault();
      navigate(url.pathname, url.search, false);
    }
  }
});

window.addEventListener('popstate', function(event) {
  navigate(window.location.pathname || '/', window.location.search, true);
});

function navigate(path, search, fromBackButton) {
  var history = search == '?history';
  var rev;
  if (search.substring(0, 5) == '?rev=') {
    rev = search.substring(5);
  }
  Dispatcher.dispatch('navigate', {path: path, history: history, rev: rev});
  !fromBackButton && window.history.pushState(null, null, path + search);
  if (history) {
    ajax.get(path + '?history', function(res) {
      if (!res.ok) return;
      Dispatcher.dispatch('historyUpdate', res.versions);
    });
  } else {
    ajax.get(path + search, function(res) {
      if (!res.ok) return;
      Dispatcher.dispatch('docUpdate', {doc: res, rev: rev});
      document.title = res.title;
    });
  }
}

marked.setOptions({
  renderer: new marked.Renderer(),
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  smartLists: true,
  smartypants: true,
  highlight: function (code) {
    return hljs.highlightAuto(code).value;
  }
});

function main(initialData) {
  Data.init(React.addons.update(
    initialData,
    {
      keys: {$set: cookie.get('keys')},
      history: {$set: window.location.search == '?history'},
      versions: {$set: []},
      editing: {$set: false},
      changed: {$set: false},
      search: {$set: null},
      html: {$set: marked(initialData.text)}
    }
  ));
  React.renderComponent(<Home />, document.getElementById('home'));

  if (window.location.search) {
    navigate(initialData.path, window.location.search, true);
  }

  var channel = new goog.appengine.Channel(initialData.token);
  channel.open({
    onopen: function() {
    },
    onmessage: function(m) {
      var msg = JSON.parse(m.data);
      if (msg.event == 'pageUpdate') {
        Dispatcher.dispatch('docUpdateByOthers', msg.info);
      }
    },
    onerror: function() {
    },
    onclose: function() {
    }
  });

}

main(window['data']);
