/** @jsx react.DOM **/
var react = require('../react');

var icons = {
  right: function(ctx) {
    ctx.beginPath();
    ctx.moveTo(14, 10);
    ctx.lineTo(14, 22);
    ctx.lineTo(22, 16);
    ctx.lineTo(14, 10);
    ctx.closePath();
    ctx.fill();
  }
};

var Icon = react.createClass({
  render: function() {
    if (!this.props.icon) {
      return this.transferPropsTo(
        <div className="ib" style={{width: 16, height: 16}} />
      );
    }
    return this.transferPropsTo(
      <canvas width="32" height="32" style={{width: 16, height: 16}} />
    );
  },

  getContext: function() {
    var ctx = this.getDOMNode().getContext('2d');
    if (this.props.color) {
      ctx.fillStyle = this.props.color;
      ctx.strokeStyle = this.props.color;
    }
    return ctx;
  },

  componentDidMount: function() {
    if (!this.props.icon) return;
    icons[this.props.icon](this.getContext());
  },

  componentDidUpdate: function(prevProps) {
    if (!this.props.icon) return;
    if (prevProps.icon === this.props.icon) return;
    var ctx = this.getContext();
    ctx.clearRect(0, 0, 32, 32);
    icons[this.props.icon](ctx);
  }

});

module.exports = Icon;
