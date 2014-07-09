/** @jsx react.DOM **/
var react = require('../react');
var cookie = require('../cookie');
var Icon = require('./Icon');
var cx = react.addons.classSet;

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
};

var Nav = react.createClass({

  getInitialState: function() {
    return {expanded: this.getExpandedMap(this.loadExpandedMap(), this.props.data.path)};
  },

  componentWillReceiveProps: function(nextProps) {
    this.setState({expanded: this.getExpandedMap(this.state.expanded, nextProps.data.path)})
  },

  loadExpandedMap: function() {
    var paths = (cookie.get('expanded') || '').split('|');
    var expanded = {};
    for (var i = 0, l = paths.length; i < l; i++) {
      expanded[paths[i]] = true;
    }
    return expanded;
  },

  saveExpandedMap: function(expanded) {
    cookie.set('expanded', Object.keys(expanded).join('|'));
  },

  getExpandedMap: function(expanded, path) {
    var bits = path.split('/');
    for (var i = 0, l = bits.length; i < l; i++) {
      expanded[bits.slice(0, i+1).join('/') || '/'] = true;
    }
    return expanded;
  },

  toggle: function(path, e) {
    e.preventDefault();
    if (this.state.expanded[path]) {
      delete this.state.expanded[path];
    } else {
      this.state.expanded[path] = true;
    }
    this.setState({expanded: this.state.expanded});
    this.saveExpandedMap(this.state.expanded);
  },

  countExpandedChildren: function(children) {
    if (!children || !children.length) return 0;
    return children.map(function(child) {
      return 1 + (this.state.expanded[child.path] ? this.countExpandedChildren(child.children) : 0);
    }.bind(this)).reduce(function(a,b) { return a+b }, 0);
  },

  render: function() {
    var tree = this.props.data.search || [pathsToTree(this.props.data.nav)];
    var children = this.renderChildren(tree, true, true);
    return children ? this.transferPropsTo(children) : <span/>;
  },

  renderChildren: function(children, expanded, root) {
    if (!children || !children.length) return null;
    return (
      <ul
        className={cx({
          'mlm':  !root,
          'no-list': true,
          't-all': true,
          'crop': true
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
    var current = child.path == this.props.data.path;
    var expanded = this.state.expanded[child.path];
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
