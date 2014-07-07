/** @jsx react.DOM **/
var react = require('../react');
var debounce = require('../debounce');
var ajax = require('../ajax');

var SEARCH_DELAY = 200;

var Search = react.createClass({

  onKeyUp: debounce(function() {
    var val = this.getDOMNode().value;
    if (!val) return this.props.onEvent('search', null);
    ajax.get('/s?q=' + encodeURIComponent(val), this.onSearchResults);
  }, SEARCH_DELAY),

  onSearchResults: function(res) {
    this.props.onEvent('search', res);
  },

  render: function() {
    return (
      <input type="text" className="full-width bb phs input" placeholder="Search" onKeyUp={this.onKeyUp} />
    );
  }
});

module.exports = Search;
