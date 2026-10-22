/* Bounded, session-only history. Large immutable image sources are shared. */
(function (root) {
  'use strict';
  function create(limit = 80) {
    let entries = [], cursor = -1, saved = null, group = null;
    function snapshot(project, context) {
      const { images, ...data } = project;
      return { data: structuredClone(data), images, key: JSON.stringify(data), context: structuredClone(context) };
    }
    function same(a, b) {
      return !!a && !!b && a.key === b.key && ['final', 'initial'].every(k => a.images[k]?.data === b.images[k]?.data && a.images[k]?.name === b.images[k]?.name);
    }
    function reset(project, context) { entries = [snapshot(project, context)]; cursor = 0; saved = entries[0]; group = null; }
    function commit(project, context, inputGroup = null) {
      const next = snapshot(project, context);
      if (same(next, entries[cursor])) return false;
      entries.splice(cursor + 1);
      if (inputGroup && inputGroup === group && cursor > 0) entries[cursor] = next;
      else { entries.push(next); cursor++; if (entries.length > limit + 1) { entries.shift(); cursor--; } }
      group = inputGroup; return true;
    }
    function peek(delta) {
      const entry = entries[cursor + delta];
      return entry ? { project: { ...structuredClone(entry.data), images: entry.images }, context: structuredClone(entry.context) } : null;
    }
    return { reset, commit, peek, move(delta) { if (!peek(delta)) return false; cursor += delta; group = null; return true; },
      context(value) { if (entries[cursor]) entries[cursor].context = structuredClone(value); },
      endGroup() { group = null; }, markSaved() { saved = entries[cursor]; group = null; },
      get clean() { return same(entries[cursor], saved); }, get canUndo() { return cursor > 0; }, get canRedo() { return cursor < entries.length - 1; } };
  }
  root.PaintHistory = { create };
})(typeof window === 'undefined' ? globalThis : window);
