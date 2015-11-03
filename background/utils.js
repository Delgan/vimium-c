"use strict";
var Utils = {
  makeNullProto: function() {
    return {__proto__: null};
  },
  fetchHttpContents: function(url, success) {
    var req = new XMLHttpRequest();
    req.open("GET", url, true);
    req.onreadystatechange = function () {
      if (this.readyState === 4 && this.status === 200) {
        success(this.responseText);
      }
    };
    req.send();
    return req;
  },
  _escapeRe: /[&<>]/g,
  _escapeCallback: function(c, n) {
    n = c.charCodeAt(0);
    return (n === 60) ? "&lt;" : (n === 62) ? "&gt;" : "&amp;";
  },
  escapeHtml: function(s) {
    return s.replace(this._escapeRe, this._escapeCallback);
  },
  // "javascript" should be treated specially
  _nonUrlPrefixes: { about: 1, blob: 1, data: 1, mailto: 1, "view-source": 1 },
  _chromePrefixes: { "chrome-extension": 1, "chrome-search": 1 },
  _urlPrefix: /^[a-z]{3,}:\/\//,
  hasOrdinaryUrlPrefix: function(url) {
    return this._urlPrefix.test(url);
  },
  // url: only accept real tab's
  isRefusingIncognito: function(url) {
    url = url.toLowerCase();
    if (url.startsWith('chrome://')) {
      return !url.startsWith("chrome://downloads");
    }
    return !url.startsWith(Settings.CONST.ChromeInnerNewTab) && url.startsWith('chrome');
  },
  _nonENTlds: ".\u4e2d\u56fd",
  _tlds: ["", "",
    ".ac.ad.ae.af.ag.ai.al.am.an.ao.aq.ar.as.at.au.aw.az.ba.bb.bd.be.bf.bg.bh.bi.bj.bm.bn.bo.br.bs.bt.bv.bw.by.bz.ca.cc.cd.cf.cg.ch.ci.ck.cl.cm.cn.co.cr.cu.cv.cx.cy.cz.de.dj.dk.dm.do.dz.ec.ee.eg.eh.er.es.et.eu.fi.fj.fk.fm.fo.fr.ga.gd.ge.gf.gg.gh.gi.gl.gm.gn.gp.gq.gr.gs.gt.gu.gw.gy.hk.hm.hn.hr.ht.hu.id.ie.il.im.in.io.iq.ir.is.it.je.jm.jo.jp.ke.kg.kh.ki.km.kn.kp.kr.kw.ky.kz.la.lb.lc.li.lk.lr.ls.lt.lu.lv.ly.ma.mc.md.me.mg.mh.mk.ml.mm.mn.mo.mp.mq.mr.ms.mt.mu.mv.mw.mx.my.mz.na.nc.ne.nf.ng.ni.nl.no.np.nr.nu.nz.om.pa.pe.pf.pg.ph.pk.pl.pm.pn.pr.ps.pt.pw.py.qa.re.ro.ru.rw.sa.sb.sc.sd.se.sg.sh.si.sj.sk.sl.sm.sn.so.sr.ss.st.su.sv.sy.sz.tc.td.tf.tg.th.tj.tk.tl.tm.tn.to.tp.tr.tt.tv.tw.tz.ua.ug.uk.um.us.uy.uz.va.vc.ve.vg.vi.vn.vu.wf.ws.ye.yt.yu.za.zm.zw",
    ".biz.cat.com.edu.gov.int.mil.mtn.net.org.pro.tel.top.xxx",
    ".aero.arpa.asia.club.coop.info.jobs.mobi.name.post",
    ".local",
    ".museum.travel"
  ],
  _hostRe: /^([^:]+(:[^:]+)?@)?([^:]+|\[[^\]]+\])(:\d{2,5})?$/,
  _ipRe: /^(\d{1,3}\.){3}\d{1,3}$/,
  spacesRe: /[\s\u3000]+/g,
  _nonENTldRe: /[^a-z]/,
  _jsNotEscapeRe: /["\[\]{}\u00ff-\uffff]|%(?![\dA-F]{2}|[\da-f]{2})/,
  filePathRe: /^['"]?((?:[A-Za-z]:[\\/]|\/(?:Users|home|root)\/)[^'"]*)['"]?$/,
  convertToUrl: function(string, keyword) {
    if (string.substring(0, 11).toLowerCase() === "javascript:") {
      if (Settings.CONST.ChromeVersion < 46 && string.indexOf('%', 11) > 0
          && !this._jsNotEscapeRe.test(string)) {
        string = this.decodeURLPart(string);
      }
      return string;
    }
    var type = -1, expected = 1, index, index2, oldString, arr;
    // NOTE: here '\u3000' is changed to ' ', which may cause a 404 (for url)
    // NOTE: here a mulit-line string is be changed to single-line,
    //       which may be better
    oldString = string.replace(this.spacesRe, ' ').trim();
    string = oldString.toLowerCase();
    if ((index = string.indexOf(' ')) > 0) {
      string = string.substring(0, index);
    }
    if ((index = string.indexOf(':')) === 0) { type = 2; }
    else if (index === -1 || string.substring(index, index + 3) !== "://") {
      if (index !== -1 && string.substring(0, index) in this._nonUrlPrefixes) {
        index2 = string.length;
        type = index2 < oldString.length || index2 <= index
          || string.charCodeAt(index + 1) === 47 ? 2 : 0;
      } else if (string.startsWith("//")) {
        string = string.substring(2);
        expected = 3; index2 = 2;
      } else {
        index2 = 0;
      }
      if (type !== -1) {}
      else if ((index = string.indexOf('/')) <= 0) {
        if (index === 0 || string.length < oldString.length - index2) { type = 2; }
      } else if (string.length >= oldString.length - index2 ||
          ((index2 = string.charCodeAt(index + 1)) > 32 && index2 !== 47)) {
        string = string.substring(0, index);
      } else {
        type = 2;
      }
    }
    else if ((index2 = string.indexOf('/', index + 3)) === -1
        ? string.length < oldString.length
        : (expected = string.charCodeAt(index2 + 1), expected <= 32 || expected === 47 )
    ) {
      type = 2;
    }
    else if (this._nonENTldRe.test(string.substring(0, index))) {
      type = (string.substring(0, index) in this._chromePrefixes)
        && (index = string.charCodeAt(index + 3)) > 32 && index !== 47 ? 0 : 2;
    }
    else if (string.startsWith("file:")) {
      if (string.charCodeAt(7) !== 47) {
        type = 2;
      } else {
        index = string.charCodeAt(8);
        type = (index > 32 && index !== 47) ? 0 : 2; // `>32`: in case of NaN
      }
    }
    else if (string.startsWith("chrome:")) {
      type = string.length < oldString.length && string.indexOf('/', 9) === -1 ? 2 : 0;
    }
    else if (string.startsWith("vimium:")) {
      type = 0;
      oldString = chrome.runtime.getURL("/") + oldString.substring(9);
    } else {
      string = string.substring(index + 3, index2 !== -1 ? index2 : undefined);
      expected = 0;
    }

    if (type !== -1) {
    } else if (!(arr = this._hostRe.exec(string))) {
      type = 2;
    } else if ((string = arr[3]).indexOf(':') !== -1 || string.endsWith("localhost")) {
      type = expected;
    } else if ((index = string.lastIndexOf('.')) <= 0) {
      type = expected !== 1 ? expected : 2;
    } else if (this._ipRe.test(string)) {
      type = expected;
    } else if (!this.isTld(string.substring(index + 1))) {
      type = 2;
    } else if (expected !== 1) {
      type = expected;
    } else if (arr[2] || arr[4] || !arr[1] || string.startsWith("ftp")) {
      type = 1;
    // the below means string is like "(?<=abc@)(uvw.)*xyz.tld"
    } else if (string.startsWith("mail") || string.indexOf(".mail") > 0
        || (index2 = string.indexOf(".")) === index) {
      type = 2;
    } else if (string.indexOf(".", ++index2) !== index) {
      type = 1;
    } else {
      type = this.isTld(string.substring(index2, index)) ? 2 : 1;
    }
    // window.type = type;
    return type === 0 ? oldString : type === 1
      ? ("http://" + oldString) : type === 3 ? ("http:" + oldString)
      : this.createSearchUrl(oldString.split(' '), keyword || "~");
  },
  isTld: function(tld) {
    if (this._nonENTldRe.test(tld)) {
      return this._nonENTlds.indexOf(tld) !== -1;
    } else if (tld.length < this._tlds.length) {
      return this._tlds[tld.length].indexOf(tld) > 0;
    }
    return false;
  },
  searchWordRe: /%[sS]/g,
  createSearchUrl: function(query, keyword) {
    query = this.createSearch(query, Settings.get("searchEnginesMap")[keyword]).url;
    if (keyword != "~") {
      query = this.convertToUrl(query);
    }
    return query;
  },
  createSearch: function(query, pattern, $S) {
    var queryStr;
    if ($S != null ? ($S === true) : pattern.$S) {
      $S = query.join(' ');
    }
    if (pattern.$s) {
      queryStr = query.map(encodeURIComponent).join('+');
    }
    return {
      url: pattern.url.replace(this.searchWordRe, function(s) {
        return (s === "%s") ? queryStr : $S;
      }),
      $s: queryStr,
      $S: $S
    };
  },
  decodeURLPart: function(url) {
    try {
      url = decodeURIComponent(url);
    } catch (e) {}
    return url;
  },
  parseSearchEngines: function(searchEnginesText, map) {
    var a, pairs, key, val, name, obj, _i, _j, _len, _len2, key0, //
    rEscapeSpace = /\\\s/g, rSpace = /\s/, rEscapeS = /\\s/g, rColon = /\\:/g;
    a = searchEnginesText.replace(/\\\n/g, '').split('\n');
    for (_i = 0, _len = a.length; _i < _len; _i++) {
      val = a[_i].trim();
      if (!(val.charCodeAt(0) > 35)) { continue; } // mask: /[ !"#]/
      _j = 0;
      do {
        _j = val.indexOf(":", _j + 1);
      } while (val[_j - 1] === '\\');
      if (_j <= 0 || !(key = val.substring(0, _j).trimRight())) continue;
      val = val.substring(_j + 1).trimLeft();
      if (!val) continue;
      val = val.replace(rEscapeSpace, "\\s");
      _j = val.search(rSpace);
      if (_j > 0) {
        name = val.substring(_j + 1).trimLeft();
        key0 = "";
        val = val.substring(0, _j);
      } else {
        name = null;
      }
      val = val.replace(rEscapeS, " ");
      obj = {url: val};
      key = key.replace(rColon, ":");
      pairs = key.split('|');
      for (_j = 0, _len2 = pairs.length; _j < _len2; _j++) {
        if (key = pairs[_j].trim()) {
          if (name) {
            if (!key0) { key0 = key; }
          } else {
            key0 = name = key;
          }
          map[key] = obj;
        }
      }
      if (!name) continue;
      obj.name = name;
      obj.$s = val.indexOf("%s") + 1;
      obj.$S = val.indexOf("%S") + 1;
      if (pairs = this.reparseSearchUrl(obj, key0)) {
        map[""].push(pairs);
      }
    }
  },
  reparseSearchUrl: function (pattern, name) {
    var url, ind = pattern.$s || pattern.$S, prefix;
    if (!ind) { return; }
    url = pattern.url.toLowerCase();
    if (!(this.hasOrdinaryUrlPrefix(url) || url.startsWith("chrome-"))) { return; }
    url = url.substring(0, ind - 1);
    if (ind = (url.indexOf("?") + 1) || (url.indexOf("#") + 1)) {
      prefix = url.substring(0, ind - 1);
      url = url.substring(ind);
      if (ind = url.lastIndexOf("&") + 1) {
        url = url.substring(ind);
      }
      if (url && url !== "=" && !url.endsWith("/")) {
        return this.makeReparser(prefix, "[?#&]", url, "([^&#]*)", name)
      }
      url = pattern.url.substring(0, (pattern.$s || pattern.$S) - 1);
    }
    prefix = url;
    url = pattern.url.substring(url.length + 2);
    if (ind = (url.indexOf("?") + 1) || (url.indexOf("#") + 1)) {
      url = url.substring(0, ind);
    }
    return this.makeReparser(prefix, "^([^?#]*)", url, "", name);
  },
  escapeAllRe: /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g,
  makeReparser: function(head, prefix, url, suffix, name) {
    url = url.toLowerCase().replace(this.escapeAllRe, "\\$&");
    if (head.startsWith("https://")) {
      head = "http" + head.substring(5);
    } else if (head.toLowerCase().startsWith("vimium://")) {
      head = chrome.runtime.getURL("/") + head.substring(9);
    }
    return [head, new RegExp(prefix + url + suffix, "i"), name];
  },
  Decoder: null,
  upperRe: /[A-Z]/
};

if (!String.prototype.startsWith) {
String.prototype.startsWith = function(s) {
  return this.length >= s.length && this.lastIndexOf(s, 0) === 0;
};
String.prototype.endsWith || (String.prototype.endsWith = function(s) {
  var i = this.length - s.length;
  return i >= 0 && this.indexOf(s, i) === i;
});
}
