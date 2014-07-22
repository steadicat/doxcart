function Set(elements) {
  this.elements = elements || [];
  this.byKey = {};
  for (var i = 0, l = elements.length; i < l; i++) {
    this.byKey[elements[i]] = true;
  }
}

Set.prototype.contains = function(element) {
  return this.byKey[element];
};

Set.prototype.add = function(element) {
  if (this.contains(element)) return this;
  return new Set(this.elements.concat([element]));
};

Set.prototype.remove = function(element) {
  if (!this.contains(element)) return this;
  return new Set(this.elements.filter(function(el) {
    return el !== element;
  }));
};

module.exports = Set;
