/** @jsx React.DOM **/
var Nav = require('./Nav');
var Search = require('./Search');

var Sidebar = React.createClass({
  mixins: [React.addons.PureRenderMixin],

  render: function() {
    return (
      <div className="top left fixed full-height quarter-width scroll text-xs sans" style={{display: this.props.data.editing ? 'none' : null}}>
        <div className="abs bottom left pam">
          <div className="mbl">
            {this.props.data.dropbox &&
              <a href="/_/dropbox/disconnect">Disable Dropbox Sync</a>}
            {!this.props.data.dropbox &&
              <a href="/_/dropbox">Enable Dropbox Sync</a>}
          </div>
          <div className="nobr">
            <img src={this.props.data.gravatar} className="ib mid" style={{width: 30, height: 30, borderRadius: 15, marginTop: 1}} />
            <div className="ib mid pls" style={{lineHeight: '14px'}}>
              <div>{this.props.data.user}</div>
              <a href={this.props.data.logoutUrl}>Log out</a>
            </div>
          </div>
        </div>
        <div className="plm prh mts">
          <Search
            data={this.props.data}
            onEvent={this.props.onEvent}
          />
          <Nav
            className="mts"
            style={{marginLeft: -8}}
            data={this.props.data}
            onEvent={this.props.onEvent}
          />
        </div>
      </div>
    );
  }
});

module.exports = Sidebar;
