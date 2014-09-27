/** @jsx React.DOM **/

var Toolbar = React.createClass({
  mixins: [React.addons.PureRenderMixin],

  onEdit: function() {
    this.props.onEvent('editOn');
  },

  onSave: function() {
    this.props.onEvent('save');
  },

  onCancel: function() {
    this.props.onEvent('editOff');
  },

  onSetKeys: function(mode) {
    this.props.onEvent('setKeys', mode);
  },

  render: function() {
    return (
      <div className={'fixed top right right-align bb sans text-xs phm half-width'}>
        <div className={'pts ' + (this.props.data.editing ? ' white-bg' : '')}>
          {!this.props.data.editing && !this.props.data.history && this.props.data.versions.length ?
            <a className="phs" href="?history">History</a> : null}
          {this.props.data.history &&
            <a className="phs" href={this.props.data.path}>Back</a>}
          {this.props.data.editing && !this.props.data.keys &&
            <a className="phs pointer" onClick={this.onSetKeys.bind(this, 'emacs')}>Emacs</a>}
          {this.props.data.editing && !this.props.data.keys &&
            <a className="phs pointer" onClick={this.onSetKeys.bind(this, 'vim')}>VIM</a>}
          {this.props.data.editing && this.props.data.keys &&
            <a className="phs pointer" onClick={this.onSetKeys.bind(this, null)}>Reset Keys</a>}
          {!this.props.data.editing && !this.props.data.history &&
            <button className="phs button pointer" onClick={this.onEdit}>Edit</button>}
          {this.props.data.editing && this.props.data.changed &&
            <button className="phs mls button pointer" onClick={this.onSave}>Save</button>}
          {this.props.data.editing && !this.props.data.changed &&
            <button className="phs mls button pointer" onClick={this.onCancel}>Cancel</button>}
        </div>
      </div>
    )
  }
});

module.exports = Toolbar;
