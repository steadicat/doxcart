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
        <div className={cx({
          'pal': true,
          'centered': true,
          'half-width': !this.props.data.editing
         })}>
          <h1 className="mts">{this.props.data.title}</h1>
          {this.props.data.versions.length ? null : <div dangerouslySetInnerHTML={{__html: this.props.data.html}} />}
          {this.props.data.versions.length ? <History versions={this.props.data.versions} /> : null}
        </div>
      </div>
    )
  }
});

module.exports = Content;
