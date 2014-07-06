/** @jsx react.DOM **/
var react = require('../react');
var cookie = require('../cookie');
var ajax = require('../ajax');
var marked = require('../marked');

var Toolbar = react.createClass({

  getInitialState: function() {
    var keys = cookie.get('keys');
    this.props.editor.setKeyboardHandler(keys ? ace.require('ace/keyboard/' + keys).handler : null);
    return {
      editing: false,
      changed: false,
      keys: keys
    };
  },

  componentDidMount: function() {
    if (this.props.history) {
      this.props.onHistoryToggle(true);
    }
  },

  componentWillReceiveProps: function(nextProps) {
    if (this.props.path !== nextProps.path) {
      this.setState({changed: false, editing: false});
    }
    if (this.props.history !== nextProps.history) {
      this.props.onHistoryToggle(nextProps.history);
    }
  },

  onEdit: function() {
    this.setState({editing: true});
    this.props.onEditToggle(true);
  },

  onChange: function() {
    this.setState({changed: true});
  },

  setUnchanged: function() {
    this.setState({changed: false});
  },

  onSave: function() {
    ajax.put(window.location.pathname, {
      text: this.props.editor.getValue(),
      html: marked(this.props.editor.getValue())
    }, this.onSaveDone);
  },

  onSaveDone: function(res) {
    this.setState({changed: false});
    this.onCancel();
    res.nav && this.props.onNavUpdate(res.nav);
  },

  onCancel: function() {
    this.setState({editing: false});
    this.props.onEditToggle(false);
  },

  onSetKeys: function(mode) {
    this.setState({keys: mode});
    mode ? cookie.set('keys', mode) : cookie.del('keys');
    this.props.editor.setKeyboardHandler(mode ? ace.require('ace/keyboard/' + mode).handler : null);
  },

  render: function() {
    return (
      <div className="fixed top full-width left sans text-xs">
        <div className="mrm phs rel">
          <div className="abs top right mrm mts">
            {!this.state.editing && !this.props.history &&
              <a className="phs" href="?history">History</a>}
            {this.props.history &&
              <a className="phs" href={this.props.path}>Back</a>}
            {this.state.editing && !this.state.keys &&
              <a className="phs pointer" onClick={this.onSetKeys.bind(this, 'emacs')}>Emacs</a>}
            {this.state.editing && !this.state.keys &&
              <a className="phs pointer" onClick={this.onSetKeys.bind(this, 'vim')}>VIM</a>}
            {this.state.editing && this.state.keys &&
              <a className="phs pointer" onClick={this.onSetKeys.bind(this, null)}>Reset Keys</a>}
            {!this.state.editing && !this.props.history &&
              <button className="phs button pointer" onClick={this.onEdit}>Edit</button>}
            {this.state.editing && this.state.changed &&
              <button className="phs mls button pointer" onClick={this.onSave}>Save</button>}
            {this.state.editing && !this.state.changed &&
              <button className="phs mls button pointer" onClick={this.onCancel}>Cancel</button>}
          </div>
        </div>
      </div>
    )
  }
});

module.exports = Toolbar;
