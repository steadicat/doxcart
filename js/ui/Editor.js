/** @jsx React.DOM **/
var debounce = require('../debounce');
var DataMixin = require('./DataMixin');
var Dispatcher = require('./Dispatcher');

var EDIT_DELAY = 200;

var Editor = React.createClass({
  mixins: [React.addons.PureRenderMixin, DataMixin],

  componentWillMount: function() {
    this._initialText = this.get('text');
    this._currentPath = this.get('path');
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
    editor.renderer.setScrollMargin(46, 46);
    editor.setOption('scrollPastEnd', 0.6);
    editor.getSession().setUseWrapMode(true);
    editor.getSession().setTabSize(2);
    editor.getSession().setUseSoftTabs(true);
    editor.getSession().on('change', this.onChange);
    editor.setKeyboardHandler(this.get('keys') ? ace.require('ace/keyboard/' + this.get('keys')).handler : null);
  },

  componentDidUpdate: function(prevProps, prevState) {
    if (this.get('keys') !== prevState.keys) {
      this.editor.setKeyboardHandler(this.get('keys') ? ace.require('ace/keyboard/' + this.get('keys')).handler : null);
    }
    if (prevState.editing !== this.get('editing')) {
      this.editor.resize();
    }
    if ((this.get('text') !== prevState.text) && this.isNewDoc(prevState)) {
      this.editor.setValue(this.get('text'), -1);
      this._currentPath = this.get('path');
    }
  },

  isNewDoc: function(prevState) {
    return (this.get('path') !== this._currentPath) ||
      (this.get('changedByOthersText') !== prevState.changedByOthersText) ||
      (this.get('rev') !== prevState.rev);
;
  },

  onChange: function() {
    if (this.editor.curOp && this.editor.curOp.command.name) this.onChangeDebounced();
  },

  onChangeDebounced: debounce(function() {
    Dispatcher.dispatch('edit', this.editor.getValue());
  }, EDIT_DELAY),

  render: function() {
    return (
      <div className="top fixed top right half-width full-height ptl bb border-left border-gray" style={{display: this.get('editing') ? null : 'none'}}>
        <div className="abs top bottom full-width">
          <pre id="editor" className="block abs full-width top bottom">
            {this._initialText}
          </pre>
        </div>
      </div>
    );
  }

});

module.exports = Editor;
