/** @jsx React.DOM **/
var Nav = require('./Nav');
var Editor = require('./Editor');
var Content = require('./Content');
var Sidebar = require('./Sidebar');
var Toolbar = require('./Toolbar');
var Progress = require('./Progress');

var Home = React.createClass({

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
        {this.props.data.changedBy && this.props.data.editing && <div className="abs top-left full-width red-bg white text-xs sans pvs center-align pointer" onClick={this.update}>
           This doc was just changed by {this.props.data.changedBy}.
           {' '}
           {this.props.data.changed ? 'Please make note of your changes elsewhere then update.' : 'Click here to update before you make any changes.'}
         </div>}
        {this.props.data.changedBy && !this.props.data.editing && <a className="fixed top-left full-width yellow-bg white text-xs sans pvs center-align pointer block" onClick={this.update}>
           This doc was just changed by {this.props.data.changedBy}.
           Click here to update.
         </a>}
        <Progress />
      </div>
    );
  }

});

module.exports = Home;
