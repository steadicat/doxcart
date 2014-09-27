/** @jsx React.DOM **/
var Nav = require('./Nav');
var Editor = require('./Editor');
var Content = require('./Content');
var Sidebar = require('./Sidebar');
var Toolbar = require('./Toolbar');
var Progress = require('./Progress');
var DataMixin = require('./DataMixin');
var Dispatcher = require('./Dispatcher');

var Home = React.createClass({
  mixins: [React.addons.PureRenderMixin, DataMixin],

  update: function() {
    this.get('editing') && Dispatcher.dispatch('editOff');
    Dispatcher.dispatch('docUpdate', {doc: {
      title: this.get('title'),
      text: this.get('changedByOthersText')
    }});
  },

  render: function() {
    return (
      <div>
        <Editor />
        <Content />
        <Sidebar />
        <Toolbar />
        {this.get('changedBy') && this.get('editing') && <div className="abs top-left full-width red-bg white text-xs sans pvs center-align pointer" onClick={this.update}>
           This doc was just changed by {this.get('changedBy')}.
           {' '}
           {this.get('changed') ? 'Please make note of your changes elsewhere then update.' : 'Click here to update before you make any changes.'}
         </div>}
        {this.get('changedBy') && !this.get('editing') && <a className="fixed top-left full-width yellow-bg white text-xs sans pvs center-align pointer block" onClick={this.update}>
           This doc was just changed by {this.get('changedBy')}.
           Click here to update.
         </a>}
        <Progress />
      </div>
    );
  }

});

module.exports = Home;
