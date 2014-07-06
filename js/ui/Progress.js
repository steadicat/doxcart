/** @jsx react.DOM **/
var react = require('../react');

var Progress = react.createClass({

  getInitialState: function() {
    return {progress: 0};
  },

  start: function() {
  },

  setProgress: function(ratio) {
    if (this.state.progress == 0) {
      if (ratio == 1) return;
      if (!this._interval) {
        this._interval = setInterval(this.updateProgress, 100);
      }
    }
    this.setState({progress: ratio});
  },

  updateProgress: function() {
    this.setState({progress: this.state.progress * 0.95 + 0.05});
  },

  end: function() {
    if (this.state.progress == 0) return;
    this.setProgress(1);
    this._timeout = setTimeout(this.clear, 200);
  },

  clear: function() {
    this.setState({progress: 0});
    this._interval && clearInterval(this._interval);
    this._interval = null;
    this._timeout && clearTimeout(this._timeout);
    this._timeout = null;
  },

  componentWillUnmount: function() {
    this.clear();
  },

  render: function() {
    if (this.state.progress == 0) return <div/>;
    return (
      <div
        className="fixed top left blue-bg t-width"
        style={{height: 2, width: (this.state.progress * 100) + '%'}}
      />
    );
  }

});

module.exports = Progress;
