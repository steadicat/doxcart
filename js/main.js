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

var restoreNav;

var doSearch = debounce(function() {
  if (!search.value) {
    if (restoreNav) {
      navCol.innerHTML = restoreNav;
      restoreNav = null;
    }
    return;
  }
  ajax.get('/s?q=' + encodeURIComponent(search.value), function(res) {
    var doc = JSON.parse(res);
    if (!restoreNav) restoreNav = navCol.innerHTML;
    navCol.innerHTML = doc.Nav;
  });
});

var edit = ge('edit');
var save = ge('save');
var cancel = ge('cancel');
var navCol = ge('navCol');
var editorCol = ge('editorCol');
var contentCol = ge('contentCol');
var content = ge('content');
var body = ge('body');
var search = ge('search');

var handlers = {
  click: {
    edit: function(e) {
      search.value = '';
      doSearch();
      hide(edit);
      show(cancel);
      show(editorCol);
      hide(navCol);
      hide(search);
      addClass('half-width', contentCol);
      removeClass('half-width', content);
    },
    save: function(e) {
      body.innerHTML = marked(editor.getValue());
      ajax.put(window.location.href, {
        text: editor.getValue(),
        html: marked(editor.getValue())
      }, function(res) {
        var doc = JSON.parse(res);
        if (doc.Nav) {
          navCol.innerHTML = doc.Nav;
        }
      });
      show(edit);
      hide(save);
      hide(editorCol);
      show(navCol);
      show(search);
      removeClass('half-width', contentCol);
      addClass('half-width', content);
    },
    cancel: function() {
      show(edit);
      hide(cancel);
      hide(editorCol);
      show(navCol);
      show(search);
      removeClass('half-width', contentCol);
      addClass('half-width', content);
    }
  },
  keyup: {
    search: doSearch
  },
  change: {
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
