var Data = {};

var subscriptions = {};

Data.init = function(initialData) {
  window['data'] = initialData;
};

Data.get = function(key) {
  return window['data'][key];
};

Data.subscribe = function(key, cb) {
  subscriptions[key] || (subscriptions[key] = []);
  var index = subscriptions[key].length;
  subscriptions[key].push(cb);
  return function() {
    subscriptions[key][index] = null;
  };
};

Data.update = function(change) {
  window['data'] = React.addons.update(window['data'], change);
  Object.keys(change).map(function(key) {
    (subscriptions[key] || []).filter(function(x) {
      return x !== null;
    }).forEach(function(subscription) {
      subscription(key, window['data'][key]);
    });
  });
};

module.exports = Data;
