/** @jsx React.DOM **/
var cookie = require('../cookie');
var set = require('../set');
var Icon = require('./Icon');
var DataMixin = require('./DataMixin');
var cx = React.addons.classSet;

function pathsToTree(links) {
  var byPath = {'/': {title: 'Home', children: [], path: "/"}};
  for (var i = 0, l = links.length; i < l; i++) {
    var path = links[i].path;
    if (!path) continue;
    byPath[path] = links[i];
    links[i].children = [];
    if (path == '/') continue;
    var parentPath = path;
    var parent = null;
    while (!parent) {
      parentPath = parentPath.substring(0, parentPath.lastIndexOf('/')) || '/';
      parent = byPath[parentPath];
    }
    parent.children.push(links[i]);
    links[i].hasParent = true;
  }
  return byPath['/'];
}

var Nav = React.createClass({
  mixins: [React.addons.PureRenderMixin, DataMixin],

  getInitialState: function() {
    return {expanded: this.getExpandedMap(this.loadExpandedMap(), this.get('path'))};
  },

  componentWillReceiveUpdate: function(key, val) {
    if (key == 'path') {
      this.setState({expanded: this.getExpandedMap(this.state.expanded, val)});
    }
  },

  loadExpandedMap: function() {
    var paths = (cookie.get('expanded') || '').split('|');
    return new set(paths);
  },

  saveExpandedMap: function(expanded) {
    cookie.set('expanded', expanded.elements.join('|'));
  },

  getExpandedMap: function(expanded, path) {
    var bits = path.split('/');
    for (var i = 0, l = bits.length; i < l; i++) {
      expanded = expanded.add(bits.slice(0, i+1).join('/') || '/');
    }
    return expanded;
  },

  toggle: function(path, e) {
    e.preventDefault();
    var expanded = this.state.expanded.contains(path) ? this.state.expanded.remove(path) : this.state.expanded.add(path);
    this.setState({expanded: expanded});
    this.saveExpandedMap(expanded);
  },

  countExpandedChildren: function(children) {
    if (!children || !children.length) return 0;
    return children.map(function(child) {
      return 1 + (this.state.expanded.contains(child.path) ? this.countExpandedChildren(child.children) : 0);
    }.bind(this)).reduce(function(a,b) { return a+b }, 0);
  },

  render: function() {
    var tree = this.get('search') || [pathsToTree(this.get('nav'))];
    var children = this.renderChildren(tree, true, true);
    return children ? this.transferPropsTo(children) : <span/>;
  },

  renderChildren: function(children, expanded, root) {
    if (!children || !children.length) return null;
    return (
      <ul
        className={cx({
          'pbl': root,
          'mlm': !root,
          'no-list t-all crop': true
        })}
        style={{
          height: expanded ? (this.countExpandedChildren(children) * 20) : 0,
          opacity: expanded ? 1 : 0,
          transform: expanded ? null : 'scale(0.5)',
          transformOrigin: '0 0'
        }}>
        {children.map(this.renderChild)}
      </ul>
    );
  },

  renderChild: function(child) {
    var current = child.path == this.get('path');
    var expanded = this.state.expanded.contains(child.path);
    var hasChildren = child.children && !!child.children.length;
    return (
      <li key={child.path} className="nobr">
        <Icon
          className={cx({
            'pointer': hasChildren,
            't-transform': true,
            'rotate90': expanded
          })}
          style={{verticalAlign: -3}}
          icon={(hasChildren && child.hasParent) ? 'right' : null}
          color="#aaa"
          onClick={this.toggle.bind(this, child.path)}
        />
        <a
          href={child.path}
          className={cx({
            b: current,
            black: !current
          })}>
          {child.title}
        </a>
        {this.renderChildren(child.children, expanded)}
      </li>
    );
  }
});

module.exports = Nav;
