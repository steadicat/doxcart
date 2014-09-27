/** @jsx React.DOM **/
var Nav = require('./Nav');
var Search = require('./Search');
var DataMixin = require('./DataMixin');

var Sidebar = React.createClass({
  mixins: [React.addons.PureRenderMixin, DataMixin],

  render: function() {
    return (
      <div className="top left fixed full-height quarter-width text-xs sans" style={{display: this.get('editing') ? 'none' : null}}>
          <div className="abs left" style={{top: 46, bottom: 100, right: 16}}>
            <div className="full-height plm left right scroll">
              <Nav
                className="mts"
                style={{marginLeft: -8}}
              />
            </div>
        </div>
        <div className="abs top left layer ptm plm prm white-bg" style={{right: 16}}>
          <Search />
        </div>
        <div className="abs bottom left pvm phm bb layer z1 white-bg-top" style={{right: 16}}>
          <div className="mbm nobr">
            {this.get('dropbox') &&
              <a href="/_/dropbox/disconnect">Disable Dropbox Sync</a>}
            {!this.get('dropbox') &&
              <a href="/_/dropbox">Enable Dropbox Sync</a>}
          </div>
          <div className="nobr">
            <img src={this.get('gravatar')} className="ib mid" style={{width: 30, height: 30, borderRadius: 15, marginTop: 1}} />
            <div className="ib mid pls" style={{lineHeight: '14px'}}>
              <div>{this.get('user')}</div>
              <a href={this.get('logoutUrl')}>Log out</a>
            </div>
          </div>
        </div>

      </div>
    );
  }
});

module.exports = Sidebar;
