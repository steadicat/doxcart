/** @jsx react.DOM **/
var react = require('../react');
var debounce = require('../debounce');

var EDIT_DELAY = 200;

var Editor = react.createClass({

  componentWillMount: function() {
    this._initialText = this.props.data.text;
    this._currentPath = this.props.data.path;
  },

  componentDidMount: function() {
    var editor = this.editor = ace.edit('editor');
    editor.setTheme('ace/theme/tomorrow');
    editor.getSession().setMode("ace/mode/markdown");
    editor.setFontSize(14);
    editor.setHighlightActiveLine(false);
    editor.setShowPrintMargin(false);
    editor.renderer.setShowGutter(false);
    editor.renderer.setPadding(32);
    editor.session.setUseWrapMode(true);
    editor.session.setTabSize(2);
    editor.getSession().on('change', this.onChange);
    editor.setKeyboardHandler(this.props.data.keys ? ace.require('ace/keyboard/' + this.props.data.keys).handler : null);
  },

  componentDidUpdate: function(prevProps) {
    if (this.props.data.keys !== prevProps.data.keys) {
      this.editor.setKeyboardHandler(this.props.data.keys ? ace.require('ace/keyboard/' + this.props.data.keys).handler : null);
    }
    if (prevProps.data.editing !== this.props.data.editing) {
      this.editor.resize();
    }
    if ((this.props.data.text !== prevProps.data.text) && this.isNewDoc(prevProps)) {
      this.editor.setValue(this.props.data.text, -1);
      this._currentPath = this.props.data.path;
    }
  },

  isNewDoc: function(prevProps) {
    return (this.props.data.path !== this._currentPath) ||
      (this.props.data.changedByOthersText !== prevProps.data.changedByOthersText) ||
      (this.props.data.rev !== prevProps.data.rev);
;
  },

  onChange: function() {
    if (this.editor.curOp && this.editor.curOp.command.name) this.onChangeDebounced();
  },

  onChangeDebounced: debounce(function() {
    this.props.onEvent('edit', this.editor.getValue());
  }, EDIT_DELAY),

  render: function() {
    return (
      <div className="top fixed top right half-width full-height ptl bb border-left border-gray" style={{display: this.props.data.editing ? null : 'none'}}>
        <pre id="editor" className="block full-height full-width">
          {this._initialText}
        </pre>
      </div>
    );
  }

});

module.exports = Editor;
