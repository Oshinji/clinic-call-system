// =============================================
// デモモード用の Firebase 置き換え
// URL に ?demo=1 が付いているときだけ動く。Firebase のアカウントなしで、
// 同じブラウザ内の「操作パネル」と「モニター」を localStorage + BroadcastChannel でつなぐ。
// 本番（?demo=1 なし）では何もしないので、通常の動作には一切影響しない。
// =============================================
(function () {
  if (new URLSearchParams(location.search).get('demo') !== '1') return;

  var PREFIX = 'clinic-call-demo:';
  var chan = ('BroadcastChannel' in window) ? new BroadcastChannel('clinic-call-demo') : null;
  var listeners = {};   // path -> [callback]
  var TIMESTAMP = { '.sv': 'timestamp' };

  function load(path) {
    try { var s = localStorage.getItem(PREFIX + path); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  }
  function save(path, value) {
    try { localStorage.setItem(PREFIX + path, JSON.stringify(value)); } catch (e) {}
    notify(path);
    if (chan) chan.postMessage({ path: path });
  }
  function resolveTimestamps(v) {
    if (v && typeof v === 'object') {
      Object.keys(v).forEach(function (k) {
        if (v[k] === TIMESTAMP) v[k] = Date.now();
      });
    }
    return v;
  }
  function snapshot(value) {
    return {
      val: function () { return value; },
      exists: function () { return value !== null && value !== undefined; },
      forEach: function (fn) {
        if (!value || typeof value !== 'object') return;
        Object.keys(value).sort().forEach(function (k) { fn({ key: k, val: function () { return value[k]; } }); });
      },
    };
  }
  function notify(path) {
    (listeners[path] || []).forEach(function (l) { l.cb(snapshot(applyLimit(load(path), l.limit))); });
  }
  function applyLimit(value, limit) {
    if (!limit || !value || typeof value !== 'object') return value;
    var keys = Object.keys(value).sort().slice(-limit);
    var out = {}; keys.forEach(function (k) { out[k] = value[k]; }); return out;
  }
  if (chan) chan.onmessage = function (e) { if (e.data && e.data.path) notify(e.data.path); };
  window.addEventListener('storage', function (e) {
    if (e.key && e.key.indexOf(PREFIX) === 0) notify(e.key.slice(PREFIX.length));
  });

  function makeRef(path, limit) {
    return {
      set: function (v) { save(path, resolveTimestamps(v)); return Promise.resolve(); },
      push: function (v) {
        var cur = load(path) || {};
        var key = 'k' + String(Date.now()).padStart(15, '0') + Math.random().toString(36).slice(2, 6);
        cur[key] = resolveTimestamps(v);
        save(path, cur);
        return Promise.resolve();
      },
      limitToLast: function (n) { return makeRef(path, n); },
      on: function (ev, cb) {
        if (ev !== 'value') return;
        (listeners[path] = listeners[path] || []).push({ cb: cb, limit: limit });
        setTimeout(function () { cb(snapshot(applyLimit(load(path), limit))); }, 0);
      },
    };
  }

  var db = { ref: function (path) { return makeRef(path); } };
  function database() { return db; }
  database.ServerValue = { TIMESTAMP: TIMESTAMP };

  window.firebase = {
    initializeApp: function () {},
    database: database,
    auth: function () {
      return {
        onAuthStateChanged: function (cb) { setTimeout(function () { cb({ uid: 'demo' }); }, 0); },
        signInWithEmailAndPassword: function () { return Promise.resolve({ user: { uid: 'demo' } }); },
      };
    },
  };

  // 画面右下に「デモ」バッジ
  window.addEventListener('DOMContentLoaded', function () {
    var b = document.createElement('div');
    b.textContent = 'デモモード（Firebase未接続・同じブラウザ内だけで動作）';
    b.style.cssText = 'position:fixed;right:8px;top:8px;background:#b45309;color:#fff;font:12px/1.4 sans-serif;padding:4px 8px;border-radius:4px;z-index:9999;opacity:.9';
    document.body.appendChild(b);
  });
})();
