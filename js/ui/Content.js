/** @jsx react.DOM **/
var react = require('../react');
var History = require('./History');
var cx = react.addons.classSet;

var Content = react.createClass({

  render: function() {
    return (
      <div className={cx({
        'top': true,
        'left': true,
        'fixed': true,
        'full-width': !this.props.data.editing,
        'half-width': this.props.data.editing,
        'full-height': true,
        'scroll': true
      })}>
        <div id="content" className={cx({
          'pal': true,
          'rel': true,
          'centered': true,
          'half-width': !this.props.data.editing
        })}>
          <h1 className="mts">{this.props.data.title}</h1>
          {this.props.data.rev && !this.props.data.editing && <a href={this.props.data.path} className="yellow-bg white text-xs sans mbl phm pvs center-align pointer block rounded">
            You are viewing an old version of this page. Edit it to restore it, or click here to go back to the latest version.
          </a>}
          {this.props.data.versions.length ? null : <div dangerouslySetInnerHTML={{__html: this.props.data.html}} />}
          {this.props.data.versions.length ? <History versions={this.props.data.versions} path={this.props.data.path} /> : null}
        </div>
      </div>
    )
  }
});

module.exports = Content;
