function debounce(f) {
  var timeout;
  return function() {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(function() {
      timeout = null;
      f();
    }, 200);
  };
}

module.exports = debounce;
