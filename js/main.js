var cx = React.addons.classSet;
var ge = document.getElementById.bind(document);

function debounce(f) {
  var timeout;
  return function() {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(function() {
      timeout = null;
      f();
    }, 500);
  }
}

function getCookies() {
  var c = document.cookie, v = 0, cookies = {};
  if (document.cookie.match(/^\s*\$Version=(?:"1"|1);\s*(.*)/)) {
    c = RegExp.$1;
    v = 1;
  }
  if (v === 0) {
    c.split(/[,;]/).map(function(cookie) {
      var parts = cookie.split(/=/, 2),
      name = decodeURIComponent(parts[0].trimLeft()),
      value = parts.length > 1 ? decodeURIComponent(parts[1].trimRight()) : null;
      cookies[name] = value;
    });
  } else {
    c.match(/(?:^|\s+)([!#$%&'*+\-.0-9A-Z^`a-z|~]+)=([!#$%&'*+\-.0-9A-Z^`a-z|~]*|"(?:[\x20-\x7E\x80\xFF]|\\[\x00-\x7F])*")(?=\s*[,;]|$)/g).map(function($0, $1) {
      var name = $0,
      value = $1.charAt(0) === '"'
        ? $1.substr(1, -1).replace(/\\(.)/g, "$1")
        : $1;
      cookies[name] = value;
    });
  }
  return cookies;
}

var Nav = React.createClass({

  navigate: function(path, e) {
    e.preventDefault();
    navigate(path);
  },

  render: function() {
    return React.DOM.ul(
      {
        className: "mtm mhs no-list"
      },
      (this.props.search || this.props.nav).map(this.renderLinks)
    );
  },

  renderLinks: function(link) {
    var current = link.path == this.props.path;
    return React.DOM.li(
      {
        style: {marginLeft: this.props.search ? null : link.depth}
      },
      React.DOM.a(
        {
          href: link.path,
          className: cx({
            b: current,
            black: !current
          }),
          onClick: history.pushState && this.navigate.bind(this, link.path)
        },
        link.title
      )
    );
  }
});

var nav = React.renderComponent(
  Nav({nav: navLinks, path: path}),
  ge('navList')
);

function setAttribute(attr, value, el) {
  el.setAttribute(attr, value);
}
function setStyle(style, value, el) {
  el.style[style] = value;
}

var show = setStyle.bind(null, 'display', '');
var hide = setStyle.bind(null, 'display', 'none');
function addClass(cls, el) {
  setAttribute('class', el.className + ' ' + cls, el);
}
function removeClass(cls, el) {
  setAttribute('class', el.className.replace(new RegExp('(\\s+|^)'+cls+'(\\s+|$)', 'g'), ' '), el);
}
function hasClass(cls, el) {
  return new RegExp('(\\s+|^)'+cls+'(\\s+|$)', 'g').exec(el.className) !== null;
}

var doSearch = debounce(function() {
  if (!search.value) {
    nav.setProps({search: null});
  } else {
    ajax.get('/s?q=' + encodeURIComponent(search.value), function(res) {
      var results = JSON.parse(res);
      nav.setProps({search: results});
    });
  }
});

var edit = ge('edit');
var editing = ge('editing');
var save = ge('save');
var cancel = ge('cancel');
var navCol = ge('navCol');
var editorCol = ge('editorCol');
var contentCol = ge('contentCol');
var content = ge('content');
var title = ge('title');
var body = ge('body');
var search = ge('search');
var emacs = ge('emacs');
var vim = ge('vim');
var reset = ge('reset');

var handlers = {
  click: {
    edit: function(e) {
      search.value = '';
      doSearch();
      hide(edit);
      show(editing);
      show(cancel);
      show(editorCol);
      editor.resize();
      hide(navCol);
      addClass('half-width', contentCol);
      removeClass('half-width', content);
    },
    save: function(e) {
      body.innerHTML = marked(editor.getValue());
      ajax.put(window.location.pathname, {
        text: editor.getValue(),
        html: marked(editor.getValue())
      }, function(res) {
        var doc = JSON.parse(res);
        doc.nav && nav.setProps({nav: doc.nav});
      });
      show(edit);
      hide(editing);
      hide(save);
      hide(editorCol);
      show(navCol);
      removeClass('half-width', contentCol);
      addClass('half-width', content);
    },
    cancel: function() {
      show(edit);
      hide(editing);
      hide(cancel);
      hide(editorCol);
      show(navCol);
      removeClass('half-width', contentCol);
      addClass('half-width', content);
    },
    emacs: setKeysEmacs,
    vim: setKeysVim,
    reset: setKeysNone
  },
  keyup: {
    search: doSearch
  }
};


function handle(event) {
  document.body.addEventListener(event, function(e) {
    var h = handlers[event];
    if (!h) return;
    var handler = h[e.target.id];
    if (!handler) return;
    handler(e);
  });
}

var events = Object.keys(handlers);
for (var i=0; i<events.length; i++) {
  handle(events[i]);
}

function navigate(path, fromBackButton) {
  ajax.get(path, function(r) {
    var res = JSON.parse(r);
    if (res.ok) {
      body.innerHTML = res.html;
      title.innerHTML = res.title;
      editor.setValue(res.text, -1);
      document.title = res.title;
      !fromBackButton && window.history.pushState(null, res.title, path);
      nav.setProps({path: path});
      setTimeout(function() {
        hide(save);
        show(cancel);
      }, 500); // TODO: why 500?
    }
  });
}

window.addEventListener('popstate', function(event) {
  navigate(window.location.pathname || '/', true);
});


var editor = ace.edit("editor");
editor.setTheme('ace/theme/tomorrow');
editor.getSession().setMode("ace/mode/markdown");
editor.setFontSize(14);
editor.setHighlightActiveLine(false);
editor.setShowPrintMargin(false);
editor.renderer.setShowGutter(false);
editor.renderer.setPadding(32);
editor.session.setUseWrapMode(true);
editor.session.setTabSize(2);

function setKeysEmacs() {
  hide(emacs);
  hide(vim);
  show(reset);
  document.cookie = 'keys=emacs';
  editor.setKeyboardHandler(ace.require("ace/keyboard/emacs").handler);
}

function setKeysVim() {
  hide(emacs);
  hide(vim);
  show(reset);
  document.cookie = 'keys=vim';
  editor.setKeyboardHandler(ace.require("ace/keyboard/vim").handler);
}

function setKeysNone() {
  show(emacs);
  show(vim);
  hide(reset);
  document.cookie = 'keys=';
  editor.setKeyboardHandler(null);
}

var cookies = getCookies();
if (cookies.keys == 'emacs') {
  setKeysEmacs();
} else if (cookies.keys == 'vim') {
  setKeysVim();
}

marked.setOptions({
  renderer: new marked.Renderer(),
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: true,
  smartLists: true,
  smartypants: true,
  highlight: function (code) {
    return hljs.highlightAuto(code).value;
  }
});

editor.getSession().on('change', debounce(function(e) {
  hide(cancel);
  show(save);
  body.innerHTML = marked(editor.getValue());
}));
