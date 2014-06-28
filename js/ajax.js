!function() {

  function collect(a,f) {
    var n=[];
    for (var i = 0; i < a.length; i++) {
      var v = f(a[i]);
      if (v!=null) n.push(v);
    }
    return n;
  }

  var ajax = {};

  ajax.x = function() {
    try {
      return new ActiveXObject('Msxml2.XMLHTTP');
    } catch(e) {
      try {
        return new ActiveXObject('Microsoft.XMLHTTP');
      } catch(e) {
        return new XMLHttpRequest();
      }
    }
  };

  ajax.serialize = function(f) {
    var g = function(n) {
      return f.getElementsByTagName(n);
    };
    var nv = function(e) {
      if (e.name) return encodeURIComponent(e.name)+'='+encodeURIComponent(e.value);else return '';};var i=collect(g('input'),function(i) {
        if ((i.type!='radio'&&i.type!='checkbox')||i.checked) return nv(i);
      });
    var s = collect(g('select'), nv);
    var t = collect(g('textarea'), nv);
    return i.concat(s).concat(t).join('&');
  };

  ajax.send = function(u,f,m,a) {
    var x = ajax.x();
    x.open(m, u, true);
    x.onreadystatechange = function() {
      if (x.readyState == 4) f(x.responseText);
    };
    if (m != 'GET') {
      if (typeof a == 'object') {
        a = JSON.stringify(a);
        x.setRequestHeader('Content-type','application/json');
      } else {
        x.setRequestHeader('Content-type','application/x-www-form-urlencoded');
      }
    }
    try {
      x.send(a);
    } catch (e) {
      f({meta: {error: {error_description: 'Could not connect to the server. Is your Internet working?'}}});
    }
  };

  ajax.get = function(url, func) {
    ajax.send(url, func, 'GET');
  };

  ajax.post = function(url, args, func) {
    ajax.send(url, func || args, 'POST', func ? args : null);
  };

  ajax.put = function(url, args, func) {
    ajax.send(url, func || args, 'PUT', func ? args: null);
  };

  ajax.del = function(url, args, func) {
    ajax.send(url, func || args, 'DELETE', func ? args : null);
  };

  ajax.submit = function(url, elm, frm) {
    var e = elm;
    var f = function(r) {
      e.innerHTML = r;
    };
    ajax.post(url, f, ajax.serialize(frm));
  };

  window['ajax'] = ajax;
}();
