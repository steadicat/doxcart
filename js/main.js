var react = require('./react');
var ajax = require('./ajax');
var marked = require('./marked');

var cx = react.addons.classSet;
var ge = document.getElementById.bind(document);

function debounce(f) {
  var timeout;
  return function() {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(function() {
      timeout = null;
      f();
    }, 200);
  };
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

var icons = {
  right: function(ctx) {
    ctx.beginPath();
    ctx.moveTo(14, 10);
    ctx.lineTo(14, 22);
    ctx.lineTo(22, 16);
    ctx.lineTo(14, 10);
    ctx.closePath();
    ctx.fill();
  }
};

var Icon = react.createClass({
  render: function() {
    if (!this.props.icon) {
      return this.transferPropsTo(
        react.DOM.div(
          {
            className: 'ib',
            style: {width: 16, height: 16}
          }
        )
      );
    }
    return this.transferPropsTo(
      react.DOM.canvas(
        {
          width: 32,
          height: 32,
          style: {width: 16, height: 16}
        }
      )
    );
  },

  getContext: function() {
    var ctx = this.getDOMNode().getContext('2d');
    if (this.props.color) {
      ctx.fillStyle = this.props.color;
      ctx.strokeStyle = this.props.color;
    }
    return ctx;
  },

  componentDidMount: function() {
    if (!this.props.icon) return;
    icons[this.props.icon](this.getContext());
  },

  componentDidUpdate: function(prevProps) {
    if (!this.props.icon) return;
    if (prevProps.icon === this.props.icon) return;
    var ctx = this.getContext();
    ctx.clearRect(0, 0, 32, 32);
    icons[this.props.icon](ctx);
  }

});


function pathsToTree(links) {
  var byPath = {'/': {title: 'Home', children: [], path: "/"}};
  for (var i = 0, l = links.length; i < l; i++) {
    var path = links[i].path;
    if (!path) continue;
    byPath[path] = links[i];
    links[i].children = [];
    if (path == '/') continue;
    var parentPath = path;
    var parent = null;
    while (!parent) {
      parentPath = parentPath.substring(0, parentPath.lastIndexOf('/')) || '/';
      parent = byPath[parentPath];
    }
    parent.children.push(links[i]);
    links[i].hasParent = true;
  }
  return byPath['/'];
};

var Nav = react.createClass({

  getInitialState: function() {
    return {expanded: this.getExpandedMap({}, this.props.path)};
  },

  onLinkClick: function(path, e) {
    if (window.history.pushState) {
      navigate(path);
      e.preventDefault();
    }
  },

  componentWillReceiveProps: function(nextProps) {
    this.setState({expanded: this.getExpandedMap(this.state.expanded, nextProps.path)})
  },

  getExpandedMap: function(expanded, path) {
    var bits = path.split('/');
    for (var i = 0, l = bits.length; i < l; i++) {
      expanded[bits.slice(0, i+1).join('/') || '/'] = true;
    }
    return expanded;
  },

  toggle: function(path, e) {
    e.preventDefault();
    this.state.expanded[path] = !this.state.expanded[path];
    this.setState({expanded: this.state.expanded});
  },

  countExpandedChildren: function(children) {
    if (!children || !children.length) return 0;
    return children.map(function(child) {
      return 1 + (this.state.expanded[child.path] ? this.countExpandedChildren(child.children) : 0);
    }.bind(this)).reduce(function(a,b) { return a+b }, 0);
  },

  render: function() {
    var tree = this.props.search || [pathsToTree(this.props.nav)];
    var children = this.renderChildren(tree, true, true);
    return children ? this.transferPropsTo(children) : react.DOM.span();
  },

  renderChildren: function(children, expanded, root) {
    if (!children || !children.length) return null;
    return react.DOM.ul(
      {
        className: cx({
          'mlm':  !root,
          'no-list': true,
          't-all': true,
          'crop': true
        }),
        style: {
          height: expanded ? (this.countExpandedChildren(children) * 20) : 0,
          opacity: expanded ? 1 : 0,
          transform: expanded ? null : 'scale(0.5)',
          transformOrigin: '0 0'
        }
      },
      children.map(this.renderChild)
    );
  },

  renderChild: function(child) {
    var current = child.path == this.props.path;
    var expanded = this.state.expanded[child.path];
    var hasChildren = child.children && !!child.children.length;
    return react.DOM.li(
      {
        key: child.path,
        className: 'nobr'
      },
      Icon({
        className: cx({
          'pointer': hasChildren,
          't-transform': true,
          'rotate90': expanded
        }),
        style: {verticalAlign: -3},
        icon: (hasChildren && child.hasParent) ? 'right' : null,
        color: '#aaa',
        onClick: this.toggle.bind(this, child.path)
      }),
      react.DOM.a(
        {
          href: child.path,
          className: cx({
            b: current,
            black: !current
          }),
          onClick: this.onLinkClick.bind(this, child.path)
        },
        child.title
      ),
      this.renderChildren(child.children, expanded)
    );
  }
});

var Progress = react.createClass({

  getInitialState: function() {
    return {progress: 0};
  },

  start: function() {
  },

  setProgress: function(ratio) {
    if (this.state.progress == 0) {
      if (ratio == 1) return;
      if (!this._interval) {
        this._interval = setInterval(this.updateProgress, 100);
      }
    }
    this.setState({progress: ratio});
  },

  updateProgress: function() {
    this.setState({progress: this.state.progress * 0.95 + 0.05});
  },

  end: function() {
    if (this.state.progress == 0) return;
    this.setProgress(1);
    this._timeout = setTimeout(this.clear, 200);
  },

  clear: function() {
    this.setState({progress: 0});
    this._interval && clearInterval(this._interval);
    this._interval = null;
    this._timeout && clearTimeout(this._timeout);
    this._timeout = null;
  },

  componentWillUnmount: function() {
    this.clear();
  },

  render: function() {
    if (this.state.progress == 0) return react.DOM.div();
    return react.DOM.div(
      {
        className: 'fixed top left blue-bg t-width',
        style: {height: 2, width: (this.state.progress * 100) + '%'}
      }
    );
  }

});

ajax.progress = progress;


var History = react.createClass({

  isCreation: function(i) {
    return (
      (i == this.props.versions.length - 1) ||
        ((i < this.props.versions.length - 1) && (this.props.versions[i + 1].deleted))
    );
  },

  getAction: function(version, i) {
    if (i == this.props.versions.length - 1) return 'Created by ';
    if (this.isCreation(i)) return 'Recreated by ';
    if (version.deleted) return 'Deleted by ';
    return 'Edited by ';
  },

  render: function() {
    return react.DOM.ul(
      {
        className: 'sans no-list',
        style: {marginLeft: 0}
      },
      this.props.versions.map(this.renderVersion)
    );
  },

  renderVersion: function(version, i) {
    return (
      react.DOM.li(
        {
          className: cx({
            'rel': true,
            'mbs': true,
            'red': version.deleted,
            'green': this.isCreation(i)
          })
        },
        this.getAction(version, i),
        react.DOM.span(
          {
            className: 'b'
          },
          version.author
        ),
        react.DOM.div(
          {
            className: 'gray aa text-xs'
          },
          new Date(Date.parse(version.date)).toLocaleString()
        ),
        !version.deleted && false && react.DOM.div(
          {
            className: 'abs top right'
          },
          react.DOM.a(
            {},
            'Restore'
          ),
          react.DOM.a(
            {
              className: 'mlm'
            },
            'View'
          )
        )
      )
    )
  }

});

var Toolbar = react.createClass({
  render: function() {
    return react.DOM.div({});
  }
});

function showHistory(e) {
  if (e) e.preventDefault();
  window.history.pushState && window.history.pushState(null, null, window.location.pathname + '?history');
  show(historyCancel);
  hide(editorCol);
  hide(edit);
  hide(historyButton);
  show(contentCol);
  show(cancel);
  progress.start();
  ajax.get(window.location.pathname + '?history', function(res) {
    progress.end();
    var doc = JSON.parse(res);
    if (!doc.ok) return;
    react.renderComponent(History({versions: doc.versions}), body);
  });
}

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
    progress.start();
    ajax.get('/s?q=' + encodeURIComponent(search.value), function(res) {
      progress.end();
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
var historyButton = ge('history');
var historyCancel = ge('historyCancel');

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
      progress.start();
      ajax.put(window.location.pathname, {
        text: editor.getValue(),
        html: marked(editor.getValue())
      }, function(res) {
        progress.end();
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
    reset: setKeysNone,
    history: showHistory
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

document.body.addEventListener('click', function(e) {
  if (e.target.tagName == 'A') {
    var url = new URL(e.target.href);
    if ((url.hostname == window.location.hostname) &&
        (url.pathname[1] !== '_') &&
        (url.search !== '?history')) {
      e.preventDefault();
      navigate(url.pathname);
    }
  }
});

function navigate(path, fromBackButton) {
  progress.start();
  nav.setProps({path: path});
  ajax.get(path, function(r) {
    var res = JSON.parse(r);
    progress.end();
    if (res.ok) {
      body.innerHTML = res.html;
      title.innerHTML = res.title;
      editor.setValue(res.text, -1);
      document.title = res.title;
      !fromBackButton && window.history.pushState(null, res.title, path);
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


var nav, progress, editor;

window['main'] = function(path, navLinks) {
  nav = react.renderComponent(
    Nav({nav: navLinks, path: path, className: 'mts', style: {marginLeft: -8}}),
    ge('navList')
  );
  progress = react.renderComponent(
    Progress({}),
    ge('progress')
  );

  editor = ace.edit("editor");
  editor.setTheme('ace/theme/tomorrow');
  editor.getSession().setMode("ace/mode/markdown");
  editor.setFontSize(14);
  editor.setHighlightActiveLine(false);
  editor.setShowPrintMargin(false);
  editor.renderer.setShowGutter(false);
  editor.renderer.setPadding(32);
  editor.session.setUseWrapMode(true);
  editor.session.setTabSize(2);

  editor.getSession().on('change', debounce(function(e) {
    hide(cancel);
    show(save);
    body.innerHTML = marked(editor.getValue());
  }));

  if (window.location.search == '?history') {
    showHistory();
  }

  var cookies = getCookies();
  if (cookies.keys == 'emacs') {
    setKeysEmacs();
  } else if (cookies.keys == 'vim') {
    setKeysVim();
  }
};
