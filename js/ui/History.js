/** @jsx react.DOM **/
var react = require('../react');
var cx = react.addons.classSet;

var History = react.createClass({

  isCreation: function(i) {
    return (
      (i == this.props.versions.length - 1) ||
        ((i < this.props.versions.length - 1) && (this.props.versions[i + 1].deleted))
    );
  },

  getAction: function(version, i) {
    if (i == this.props.versions.length - 1) return 'Created by ';
    if (this.isCreation(i)) return 'Recreated by ';
    if (version.deleted) return 'Deleted by ';
    return 'Edited by ';
  },

  render: function() {
    return (
      <ul className="sans no-list" style={{marginLeft: 0}}>
        {this.props.versions.map(this.renderVersion)}
      </ul>
    );
  },

  renderVersion: function(version, i) {
    return (
      <li
        key={i}
        className={cx({
          rel: true,
          mbm: true,
          red: version.deleted,
          green: this.isCreation(i)
        })}>
        {version.author !== (this.props.versions[i-1] && this.props.versions[i-1].author) ? <img src={version.gravatar} className="ib top mrm" style={{width: 40, height: 40, borderRadius: 20, marginTop: 2}} /> : <div className="ib" style={{width: 10, height: 10, margin: 15, marginRight: 32, borderRadius: 20, background: '#eee'}} />}
        <div className="ib top">
          {this.getAction(version, i)}
          <span className="b">{version.author}</span>
          <div className="gray aa text-xs">
            {new Date(Date.parse(version.date)).toLocaleString()}
          </div>
        </div>
        {!version.deleted && <div className="abs top right">
          <a className="mlm" href={i == 0 ? this.props.path : ('?rev=' + version.rev)}>View</a>
        </div>}
      </li>
    )
  }

});

module.exports = History;
