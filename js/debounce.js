function debounce(f, delay) {
  var timeout;
  return function() {
    var self = this;
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(function() {
      timeout = null;
      f.call(self);
    }, delay || 200);
  };
}

module.exports = debounce;
