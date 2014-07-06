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
        className={cx({
          rel: true,
          mbs: true,
          red: version.deleted,
          green: this.isCreation(i)
        })}>
        {this.getAction(version, i)}
        <span className="b">{version.author}</span>
        <div className="gray aa text-xs">
          {new Date(Date.parse(version.date)).toLocaleString()}
        </div>
        {!version.deleted && false && <div
          className="abs top right">
          <a>Restore</a>
          <a className="mlm">View</a>
        </div>}
      </li>
    )
  }

});

module.exports = History;
