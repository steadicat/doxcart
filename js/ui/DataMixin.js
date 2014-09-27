var Set = require('../set');
var Data = require('./Data');

var DataMixin = {

  getInitialState: function() {
    return {};
  },

  get: function(key) {
    if (this.state && this.state[key] !== undefined) return this.state[key];
    if (!this._keys) this._keys = new Set([]);
    if (!this._keys.contains(key)) {
      this._newKeys = (this._newKeys || new Set([])).add(key);
    }
    return Data.get(key);
  },

  componentDidMount: function() {
    this.subscribe();
  },

  componentDidUpdate: function() {
    this.subscribe();
  },

  subscribe: function() {
    this._subscriptions || (this._subscriptions = []);
    if (this._newKeys) {
      for (var i = 0, l = this._newKeys.elements.length; i < l; i++) {
        this._subscriptions.push(
          Data.subscribe(this._newKeys.elements[i], this.updateKey)
        );
        this._keys = this._keys.add(this._newKeys.elements[i]);
      }
      this._newKeys = null;
    }
  },

  updateKey: function(key, val) {
    var update = {};
    update[key] = val;
    this.componentWillReceiveUpdate && this.componentWillReceiveUpdate(key, val);
    this.setState(update);
  },

  componentWillUnmount: function() {
    while (this._subscriptions.length) {
      this._subscriptions.shift().unsubscribe();
    }
  },
};

module.exports = DataMixin;
