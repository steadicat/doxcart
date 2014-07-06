function debounce(f, delay) {
  var timeout;
  return function() {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(function() {
      timeout = null;
      f();
    }, delay || 200);
  };
}

module.exports = debounce;
