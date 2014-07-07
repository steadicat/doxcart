/** @jsx react.DOM **/
var react = require('./react');
var ajax = require('./ajax');
var marked = require('./marked');
var cookie = require('./cookie');
var Home = require('./ui/Home');

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
  dispatcher('navigate', {path: path, history: history});
  !fromBackButton && window.history.pushState(null, null, path + search);
  if (history) {
    ajax.get(path + '?history', function(res) {
      if (!res.ok) return;
      dispatcher('historyUpdate', res.versions);
    });
  } else {
    ajax.get(path, function(res) {
      if (!res.ok) return;
      dispatcher('docUpdate', res);
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

var home, data;

function update(change) {
  home.setProps({data: window['data'] = data = react.addons.update(data, change)});
}

function dispatcher(event, info) {
  switch (event) {
    case 'editOn':
    return update({editing: {$set: true}});
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
      text: data.text,
      html: marked(data.text)
    }, function(res) {
      dispatcher('saved');
      res.nav && dispatcher('navUpdate', res.nav);
    });
    case 'saved':
    return update({changed: {$set: false}, editing: {$set: false}});
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
      title: {$set: info.title},
      text: {$set: info.text},
      html: {$set: marked(info.text)},
      versions: {$set: []}
    });
    case 'navUpdate':
    return update({nav: {$set: info}});
    case 'historyUpdate':
    return update({versions: {$set: info}});
    case 'setKeys':
    info ? cookie.set('keys', info) : cookie.del('keys');
    return update({keys: {$set: info}});
  }
}

window['main'] = function(initialData) {
  data = react.addons.update(
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
  home = react.renderComponent(
    <Home
      data={window['data'] = data}
      onEvent={dispatcher}
    />,
    document.getElementById('home')
  );

};
