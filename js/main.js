/** @jsx React.DOM **/
var ajax = require('./ajax');
var marked = require('./marked');
var cookie = require('./cookie');
var Home = require('./ui/Home');
//require('../css/main.css');

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
  dispatcher('navigate', {path: path, history: history, rev: rev});
  !fromBackButton && window.history.pushState(null, null, path + search);
  if (history) {
    ajax.get(path + '?history', function(res) {
      if (!res.ok) return;
      dispatcher('historyUpdate', res.versions);
    });
  } else {
    ajax.get(path + search, function(res) {
      if (!res.ok) return;
      dispatcher('docUpdate', {doc: res, rev: rev});
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

var home;

function update(change) {
  home.setProps({data: window['data'] = React.addons.update(window['data'], change)});
}

function dispatcher(event, info) {
  switch (event) {
    case 'editOn':
    return update({
      editing: {$set: true},
      changed: {$set: !!window['data'].rev}
    });
    case 'edit':
    return update({
      changed: {$set: true},
      text: {$set: info},
      html: {$set: marked(info)}
    });
    case 'editOff':
    return update({editing: {$set: false}});
    case 'save':
    return ajax.put(window.location.pathname, {
      text: window['data'].text,
      html: marked(window['data'].text)
    }, function(res) {
      dispatcher('saved');
      res.nav && dispatcher('navUpdate', res.nav);
    });
    case 'saved':
    return update({
      changed: {$set: false},
      editing: {$set: false},
      rev: {$set: null}
    });
    case 'navigate':
    return update({
      path: {$set: info.path},
      history: {$set: info.history},
      changed: {$set: false},
      editing: {$set: false}
    });
    case 'search':
    return update({
      search: {$set: info}
    });
    case 'docUpdate':
    return update({
      title: {$set: info.doc.title},
      text: {$set: info.doc.text},
      html: {$set: marked(info.doc.text)},
      rev: {$set: info.rev},
      versions: {$set: []},
      changedBy: {$set: null},
      changedByOthersText: {$set: null}
    });
    case 'docUpdateByOthers':
    if ((info.path === window['data'].path) && (info.text !== window['data'].text)) update({
      changedBy: {$set: info.author},
      changedByOthersText: {$set: info.text}
    });
    return;
    case 'navUpdate':
    return update({nav: {$set: info}});
    case 'historyUpdate':
    return update({
      versions: {$set: info},
      rev: {$set: null}
    });
    case 'setKeys':
    info ? cookie.set('keys', info) : cookie.del('keys');
    return update({keys: {$set: info}});
  }
}

function main(initialData) {
  window['data'] = React.addons.update(
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
  );
  home = React.renderComponent(
    <Home
      data={window['data']}
      onEvent={dispatcher}
    />,
    document.getElementById('home')
  );

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
        dispatcher('docUpdateByOthers', msg.info);
      }
    },
    onerror: function() {
    },
    onclose: function() {
    }
  });

}

main(window['data']);
