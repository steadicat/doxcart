/** @jsx react.DOM **/
var react = require('./react');
var ajax = require('./ajax');
var marked = require('./marked');
var cookie = require('./cookie');
var debounce = require('./debounce');
var Nav = require('./ui/Nav');
var Progress = require('./ui/Progress');
var Toolbar = require('./ui/Toolbar');
var History = require('./ui/History');

var ge = document.getElementById.bind(document);

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
  nav.setProps({path: path});
  toolbar.onNavigation();
  ajax.get(path, function(res) {
    if (res.ok) {
      body.innerHTML = res.html;
      title.innerHTML = res.title;
      editor.setValue(res.text, -1);
      document.title = res.title;
      !fromBackButton && window.history.pushState(null, res.title, path);
      setTimeout(function() {
        toolbar.onNavigation();
      }, 500); // TODO: why 500?
    }
  });
}

window.addEventListener('popstate', function(event) {
  navigate(window.location.pathname || '/', true);
});

var progress = ajax.progress = react.renderComponent(<Progress />, document.getElementById('progress'));

function onHistoryToggle(on) {
  hide(editorCol);
  show(contentCol);
  on && ajax.get(window.location.pathname + '?history', function(res) {
    if (!res.ok) return;
    react.renderComponent(<History versions={res.versions} />, body);
  });
  !on && (body.innerHTML = marked(editor.getValue()));
}

function setAttribute(attr, value, el) {
  el.setAttribute(attr, value);
}
function setStyle(style, value, el) {
  el.style[style] = value;
}

var show = setStyle.bind(null, 'display', '');
var hide = setStyle.bind(null, 'display', 'none');
function toggle(el, on) {
  (on ? show : hide)(el);
}

function addClass(cls, el) {
  setAttribute('class', el.className + ' ' + cls, el);
}
function removeClass(cls, el) {
  setAttribute('class', el.className.replace(new RegExp('(\\s+|^)'+cls+'(\\s+|$)', 'g'), ' '), el);
}
function toggleClass(cls, el, on) {
  (on ? addClass : removeClass)(cls, el);
}

var doSearch = debounce(function() {
  if (!search.value) {
    nav.setProps({search: null});
  } else {
    ajax.get('/s?q=' + encodeURIComponent(search.value), function(res) {
      nav.setProps({search: res});
    });
  }
});

var navCol = ge('navCol');
var editorCol = ge('editorCol');
var contentCol = ge('contentCol');
var content = ge('content');
var title = ge('title');
var body = ge('body');
var search = ge('search');

document.body.addEventListener('keyup', function(e) {
  if (e.target.id == 'search') {
    doSearch();
  }
});

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

function onEditToggle(on) {
  search.value = '';
  doSearch();
  toggle(navCol, !on);
  toggle(editorCol, on);
  editor.resize();
  toggleClass('half-width', contentCol, on);
  toggleClass('half-width', content, !on);
}

var nav, progress, editor, toolbar;

function onNavUpdate(n) {
  nav.setProps({nav: n});
}

window['main'] = function(path, navLinks) {
  nav = react.renderComponent(
    <Nav
      nav={navLinks}
      path={path}
      className="mts"
      style={{marginLeft: -8}}
    />,
    ge('navList')
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

  toolbar = react.renderComponent(
    <Toolbar
      onEditToggle={onEditToggle}
      onHistoryToggle={onHistoryToggle}
      onNavUpdate={onNavUpdate}
      editor={editor}
    />,
    ge('toolbar')
  );

  editor.getSession().on('change', debounce(function(e) {
    toolbar.onChange();
    body.innerHTML = marked(editor.getValue());
  }));

};
