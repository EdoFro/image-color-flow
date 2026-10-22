/* User-authorized local writes, with download fallback for other browsers. */
(function (root) {
  'use strict';
  function create({ picker, download }) {
    let handle = null, openedName = '';
    return {
      reset(name = '') { handle = null; openedName = name; },
      async save(project, { saveAs = false, suggestedName, description }) {
        const text = JSON.stringify(project), name = saveAs ? suggestedName : handle?.name || openedName || suggestedName;
        if (!picker()) { download(name, text, 'application/json'); openedName = name; return { method: 'download', name }; }
        const target = !saveAs && handle ? handle : await picker()({ suggestedName: name, id: 'tinta-color-project', types: [{ description, accept: { 'application/json': ['.json'] } }] });
        let writable;
        try { writable = await target.createWritable(); await writable.write(text); await writable.close(); }
        catch (error) { try { await writable?.abort(); } catch (_) {} throw error; }
        handle = target; openedName = target.name;
        return { method: 'file', name: target.name };
      }
    };
  }
  root.PaintProjectFiles = { create };
})(typeof window === 'undefined' ? globalThis : window);
