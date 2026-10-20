/* Local message catalogs. Classic scripts keep file:// and standalone export support. */
(function (root) {
  'use strict';
  function createPaintI18n(options = {}) {
    const catalogs = Object.create(null), listeners = new Set();
    let language = 'es', sourceKeys = new Map(), errorPatterns = [];
    function register(code, messages) {
      if (!/^[a-z]{2}(?:-[a-z0-9]+)*$/.test(code)) throw new Error('Invalid locale code');
      catalogs[code] = { ...messages };
      sourceKeys = new Map(Object.entries(catalogs.es || {}).map(([key, value]) => [value, key]));
      errorPatterns = [];
    }
    for (const [code, messages] of Object.entries(options.catalogs || {})) register(code, messages);
    function resolve(value) { const code = String(value || '').toLowerCase().replace(/_/g, '-'); return Object.hasOwn(catalogs, code) ? code : Object.hasOwn(catalogs, code.split('-')[0]) ? code.split('-')[0] : null; }
    function t(key, values = {}) {
      const message = catalogs[language]?.[key] ?? catalogs.es?.[key] ?? key;
      return String(message).replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(values, name) ? String(values[name]) : match);
    }
    function setLanguage(value, persist = true) {
      const next = resolve(value) || 'es';
      if (persist) { try { options.storage?.setItem('colorflow.language', next); } catch (_) { /* Storage may be disabled for local files. */ } }
      if (next === language) return;
      language = next; listeners.forEach(listener => listener(next));
    }
    function choose(saved, preferred = []) { return resolve(saved) || preferred.map(resolve).find(Boolean) || 'es'; }
    function source(message) { return sourceKeys.has(message) ? t(sourceKeys.get(message)) : message; }
    function error(message) {
      const text = String(message);
      if (sourceKeys.has(text)) return source(text);
      if (!errorPatterns.length) for (const [key, template] of Object.entries(catalogs.es || {})) {
        if (!/\{\w+\}/.test(template)) continue;
        const names = [], escaped = template.split(/(\{\w+\})/g).map(part => {
          if (/^\{\w+\}$/.test(part)) { names.push(part.slice(1, -1)); return '(.*?)'; }
          return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }).join('');
        errorPatterns.push({ key, names, pattern: new RegExp('^' + escaped + '$') });
      }
      for (const entry of errorPatterns) { const match = text.match(entry.pattern); if (match) return t(entry.key, Object.fromEntries(entry.names.map((name, i) => [name, source(match[i + 1])]))); }
      const suffix = '»: coloca al menos un punto o un tramo del recorrido dentro de la zona.';
      return text.endsWith(suffix) ? text.slice(0, -suffix.length) + source(suffix) : text;
    }
    function apply(document) {
      document.documentElement.lang = language;
      for (const element of document.querySelectorAll('[data-i18n]')) element.textContent = t(element.dataset.i18n);
      for (const attribute of ['title', 'aria-label', 'placeholder']) for (const element of document.querySelectorAll('[data-i18n-' + attribute + ']')) element.setAttribute(attribute, t(element.getAttribute('data-i18n-' + attribute)));
    }
    function messages(code = language, keys) { const all = { ...catalogs.es, ...catalogs[resolve(code) || 'es'] }; return keys ? Object.fromEntries(keys.map(key => [key, all[key] ?? key])) : all; }
    language = resolve(options.language) || 'es';
    return { t, source, error, register, resolve, choose, apply, messages, catalog(code) { return { ...catalogs[resolve(code) || 'es'] }; }, setLanguage, get language() { return language; }, get languages() { return Object.keys(catalogs); }, subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); } };
  }
  let storage; try { storage = root.localStorage; } catch (_) { /* Optional preference only. */ }
  root.createPaintI18n = createPaintI18n;
  root.PaintI18n = createPaintI18n({ storage });
})(typeof window === 'undefined' ? globalThis : window);
