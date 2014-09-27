/** @jsx React.DOM **/
var History = require('./History');
var DataMixin = require('./DataMixin');
var cx = React.addons.classSet;

var Content = React.createClass({
  mixins: [React.addons.PureRenderMixin, DataMixin],

  render: function() {
    return (
      <div className={cx({
        'abs top full-height scroll': true
      })} style={{width: this.get('editing') ? '50%' : '75%', left: this.get('editing') ? 0 : '25%'}}>
        <div id="content" className={cx({
          'pvl rel': true,
          'phh': this.get('editing'),
          'prh': !this.get('editing')
        })} style={{maxWidth: 700}}>
          <h1 className="mts">{this.get('title')}</h1>
          {this.get('rev') && !this.get('editing') && <a href={this.get('path')} className="yellow-bg white text-xs sans mbl phm pvs center-align pointer block rounded">
            You are viewing an old version of this page. Edit it to restore it, or click here to go back to the latest version.
          </a>}
          {this.get('versions').length ? null : <div dangerouslySetInnerHTML={{__html: this.get('html')}} />}
          {this.get('versions').length ? <History versions={this.get('versions')} path={this.get('path')} /> : null}
        </div>
      </div>
    );
  }
});

module.exports = Content;
