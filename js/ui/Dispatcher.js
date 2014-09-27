var Data = require('./Data');
var cookie = require('../cookie');
var marked = require('../marked');
var ajax = require('../ajax');

var Dispatcher = {};

Dispatcher.dispatch = function(event, info) {
  switch (event) {
    case 'editOn':
    return Data.update({
      editing: {$set: true},
      changed: {$set: !!Data.get('rev')}
    });
    case 'edit':
    return Data.update({
      changed: {$set: true},
      text: {$set: info},
      html: {$set: marked(info)}
    });
    case 'editOff':
    return Data.update({editing: {$set: false}});
    case 'save':
    return ajax.put(window.location.pathname, {
      text: Data.get('text'),
      html: marked(Data.get('text'))
    }, function(res) {
      Dispatcher.dispatch('saved');
      res.nav && Dispatcher.dispatch('navUpdate', res.nav);
    });
    case 'saved':
    return Data.update({
      changed: {$set: false},
      editing: {$set: false},
      rev: {$set: null}
    });
    case 'navigate':
    return Data.update({
      path: {$set: info.path},
      history: {$set: info.history},
      changed: {$set: false},
      editing: {$set: false}
    });
    case 'search':
    return Data.update({
      search: {$set: info}
    });
    case 'docUpdate':
    return Data.update({
      title: {$set: info.doc.title},
      text: {$set: info.doc.text},
      html: {$set: marked(info.doc.text)},
      rev: {$set: info.rev},
      versions: {$set: []},
      changedBy: {$set: null},
      changedByOthersText: {$set: null}
    });
    case 'docUpdateByOthers':
    if ((info.path === Data.get('path')) && (info.text !== Data.get('text'))) Data.update({
      changedBy: {$set: info.author},
      changedByOthersText: {$set: info.text}
    });
    return;
    case 'navUpdate':
    return Data.update({nav: {$set: info}});
    case 'historyUpdate':
    return Data.update({
      versions: {$set: info},
      rev: {$set: null}
    });
    case 'setKeys':
    info ? cookie.set('keys', info) : cookie.del('keys');
    return Data.update({keys: {$set: info}});
  }
};

module.exports = Dispatcher;
