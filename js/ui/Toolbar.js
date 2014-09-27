/** @jsx React.DOM **/
var DataMixin = require('./DataMixin');
var Dispatcher = require('./Dispatcher');

var Toolbar = React.createClass({
  mixins: [React.addons.PureRenderMixin, DataMixin],

  onEdit: function() {
    Dispatcher.dispatch('editOn');
  },

  onSave: function() {
    Dispatcher.dispatch('save');
  },

  onCancel: function() {
    Dispatcher.dispatch('editOff');
  },

  onSetKeys: function(mode) {
    Dispatcher.dispatch('setKeys', mode);
  },

  render: function() {
    return (
      <div className={'fixed top right right-align bb sans text-xs phm half-width'}>
        <div className={'pts ' + (this.get('editing') ? ' white-bg' : '')}>
          {!this.get('editing') && !this.get('history') ?
            <a className="phs" href="?history">History</a> : null}
          {this.get('history') &&
            <a className="phs" href={this.get('path')}>Back</a>}
          {this.get('editing') && !this.get('keys') &&
            <a className="phs pointer" onClick={this.onSetKeys.bind(this, 'emacs')}>Emacs</a>}
          {this.get('editing') && !this.get('keys') &&
            <a className="phs pointer" onClick={this.onSetKeys.bind(this, 'vim')}>VIM</a>}
          {this.get('editing') && this.get('keys') &&
            <a className="phs pointer" onClick={this.onSetKeys.bind(this, null)}>Reset Keys</a>}
          {!this.get('editing') && !this.get('history') &&
            <button className="phs button pointer" onClick={this.onEdit}>Edit</button>}
          {this.get('editing') && this.get('changed') &&
            <button className="phs mls button pointer" onClick={this.onSave}>Save</button>}
          {this.get('editing') && !this.get('changed') &&
            <button className="phs mls button pointer" onClick={this.onCancel}>Cancel</button>}
        </div>
      </div>
    )
  }
});

module.exports = Toolbar;
