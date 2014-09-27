/** @jsx React.DOM **/
var debounce = require('../debounce');
var ajax = require('../ajax');
var Dispatcher = require('./Dispatcher');

var SEARCH_DELAY = 200;

var Search = React.createClass({
  mixins: [React.addons.PureRenderMixin],

  onKeyUp: debounce(function() {
    var val = this.getDOMNode().value;
    if (!val) return Dispatcher.dispatch('search', null);
    ajax.get('/s?q=' + encodeURIComponent(val), this.onSearchResults);
  }, SEARCH_DELAY),

  onSearchResults: function(res) {
    Dispatcher.dispatch('search', res);
  },

  render: function() {
    return (
      <input type="text" className="full-width bb phs input" placeholder="Search" onKeyUp={this.onKeyUp} />
    );
  }
});

module.exports = Search;
