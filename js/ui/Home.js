/** @jsx react.DOM **/
var react = require('../react');
var Nav = require('./Nav');
var Editor = require('./Editor');
var Content = require('./Content');
var Sidebar = require('./Sidebar');
var Toolbar = require('./Toolbar');
var Progress = require('./Progress');

var Home = react.createClass({

  update: function() {
    this.props.data.editing && this.props.onEvent('editOff');
    this.props.onEvent('docUpdate', {
      title: this.props.data.title,
      text: this.props.data.changedByOthersText
    });
  },

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
        {this.props.data.changedBy && this.props.data.editing && <div className="abs top-left full-width red-bg white text-xs sans pvs center-align">
           This doc was just changed by {this.props.data.changedBy}. Please save your changes elsewhere then
           {' '}
           <a className="b white pointer" onClick={this.update}>update</a>.
         </div>}
        {this.props.data.changedBy && !this.props.data.editing && <div className="abs top-left full-width yellow-bg white text-xs sans pvs center-align">
           This doc was just changed by {this.props.data.changedBy}.
           {' '}
           <a className="b white pointer" onClick={this.update}>Click here</a> to update.
         </div>}
        <Progress />
      </div>
    );
  }

});

module.exports = Home;
