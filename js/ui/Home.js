/** @jsx react.DOM **/
var react = require('../react');
var Nav = require('./Nav');
var Editor = require('./Editor');
var Content = require('./Content');
var Sidebar = require('./Sidebar');
var Toolbar = require('./Toolbar');
var Progress = require('./Progress');

var Home = react.createClass({

  render: function() {
    return (
      <div>
        <Editor
          data={this.props.data}
          onEvent={this.props.onEvent}
        />
        <Content
          data={this.props.data}
          onEvent={this.props.onEvent}
        />
        <Sidebar
          data={this.props.data}
          onEvent={this.props.onEvent}
        />
        <Toolbar
          data={this.props.data}
          onEvent={this.props.onEvent}
        />
        <Progress />
      </div>
    );
  }

});

module.exports = Home;
