var ge = document.getElementById.bind(document);

function setAttribute(attr, value, el) {
  el.setAttribute(attr, value);
}
function setStyle(style, value, el) {
  el.style[style] = value;
}

var show = setStyle.bind(null, 'display', '');
var hide = setStyle.bind(null, 'display', 'none');
var addClass = setAttribute.bind(null, 'class');
function removeClass(cls, el) {
  setAttribute('class', el.className.replace(new RegExp('(\\s+|^)'+cls+'(\\s+|$)', 'g'), ' '), el);
}

var edit = ge('edit');
var save = ge('save');
var navCol = ge('navCol');
var editorCol = ge('editorCol');
var content = ge('content');

var handlers = {
  click: {
    edit: function(e) {
      var editorEl = ge('editor');
      hide(edit);
      show(save);
      show(editorEl);
      hide(navCol);
      addClass('half-width', editorCol);
    },
    save: function(e) {
      var editorEl = ge('editor');
      ajax.put(window.location.href, {
        content: editor.getValue()
      }, function(res) {
        content.innerHTML = JSON.parse(res).Content;
      });
      show(edit);
      hide(save);
      hide(editorEl);
      show(navCol);
      removeClass('half-width', editorCol);
    }
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
