/* Preferences dialog: edits a local draft, never the current animation. */
(function (root) {
  'use strict';
  function create({ getValue, onSave, download, onLayout = () => {} }) {
    const $ = id => document.getElementById(id), i18n = root.PaintI18n, t = (key, values) => i18n.t(key, values), tx = text => i18n.source(text);
    const dialog = $('preferencesDialog'); let draft, controls = [], session = 0, notice = null;
    function message(key) { notice = key; $('preferencesStatus').textContent = key ? t(key) : ''; }
    const number = (key, label, min, max, step = 1, scale = 1) => ({ key, label, type: 'number', min, max, step, scale });
    const choice = (key, label, options) => ({ key, label, type: 'select', options });
    function addGroup(title, prefix, params) {
      const section = document.createElement('section'); section.className = 'preferences-group';
      const h = document.createElement('h3'); h.textContent = title; section.append(h);
      const fields = document.createElement('div'); fields.className = 'preferences-fields'; section.append(fields);
      const object = prefix ? draft[prefix] : draft;
      for (const p of params) {
        const label = document.createElement('label'); label.className = p.type === 'boolean' ? 'checkbox' : 'field';
        const caption = document.createElement('span'); caption.textContent = p.label;
        const input = document.createElement(p.type === 'select' ? 'select' : 'input'); input.id = 'pref-' + (prefix ? prefix + '-' : '') + p.key;
        if (p.type === 'select') {
          p.options.forEach(([value, text], index) => { const option = document.createElement('option'); option.value = String(index); option.textContent = text; input.append(option); });
          input.value = String(p.options.findIndex(([value]) => value === object[p.key]));
        } else if (p.type === 'number') {
          input.type = 'number'; input.required = true; input.min = p.min; input.max = p.max; input.step = p.step; input.value = +(object[p.key] * p.scale).toFixed(6);
        } else if (p.type === 'boolean') { input.type = 'checkbox'; input.checked = object[p.key]; }
        else { input.type = 'color'; input.value = object[p.key]; }
        if (p.type === 'boolean') label.append(input, caption); else label.append(caption, input);
        fields.append(label); controls.push({ prefix, parameter: p, input });
      }
      $('preferencesFields').append(section);
    }
    function render() {
      controls = []; $('preferencesFields').replaceChildren();
      const options = id => [...$(id).options].filter(o => !o.disabled && !o.hidden).map(o => [o.value, o.textContent]);
      const inkOptions = options('baseInkMatch');
      if (draft.baseGeneration.inkMatch === 'base-to-final' && !inkOptions.some(([value]) => value === 'base-to-final')) inkOptions.push(['base-to-final', t('copia_literal_anterior')]);
      addGroup(t('preferences_startup_group'), '', [choice('startup', t('preferences_startup'), [['example', t('preferences_load_example')], ['empty', t('preferences_empty')]])]);
      addGroup(t('preferences_editor'), 'editor', [{ key: 'showAllRadii', label: t('mostrar_todos_los_radios'), type: 'boolean' }, { key: 'compactHeader', label: t('preferences_compact_header'), type: 'boolean' }]);
      addGroup(t('preferences_images'), '', [choice('resolution', t('resolucion_de_trabajo_lado_mayor'), options('resolution').map(([v, text]) => [+v, text])), choice('baseMode', t('imagen_inicial_utilizada'), options('baseMode'))]);
      addGroup(t('preparar_imagen_inicial'), 'baseGeneration', [
        choice('method', t('preferences_algorithm'), [['protected', t('tinta_y_lineas_l_recomendado')], ['coherent', t('tinta_y_lineas_k_anterior')], ['ink', t('tinta_sobre_papel_anterior')], ['grayscale', t('desaturacion_anterior')]]),
        number('colorToGray', t('zonas_coloreadas_papel_gris') + ' (%)', 0, 100, 1, 100), number('sensitivity', t('sensibilidad_al_color') + ' (%)', 0, 100, 1, 100),
        number('blackPoint', t('llevar_grises_oscuros_a_negro') + ' (%)', 0, 90, 1, 100), number('whitePoint', t('llevar_grises_claros_al_papel') + ' (%)', 10, 100, 1, 100),
        number('smoothness', t('suavidad_de_la_transformacion') + ' (%)', 0, 100, 1, 100), choice('inkMatch', t('igualar_trazos_despues_de_l_k'), inkOptions), choice('paper', t('papel_de_la_imagen_inicial'), options('basePaper'))
      ]);
      const groups = new Set(root.PaintGeneral.parameters.map(p => p.group));
      for (const group of groups) {
        const params = root.PaintGeneral.parameters.filter(p => p.group === group).map(p => ({ ...p, label: tx(p.label) + (p.unit ? ` (${p.unit})` : ''), options: p.options?.map(([value, text]) => [value, tx(text)]) }));
        addGroup(tx(group), group === 'Puntos' ? 'point' : 'stage', params);
      }
      addGroup(t('preferences_presentation'), 'presentation', [choice('background', t('fondo_del_html'), options('exportBackground')), { key: 'color', label: t('color_de_fondo'), type: 'color' }]);
      onLayout();
    }
    function collect(report = true) {
      const value = JSON.parse(JSON.stringify(draft));
      for (const { prefix, parameter: p, input } of controls) {
        if (!input.checkValidity()) { if (report) input.reportValidity(); return null; }
        (prefix ? value[prefix] : value)[p.key] = p.type === 'boolean' ? input.checked : p.type === 'number' ? +input.value / p.scale : p.type === 'select' ? p.options[+input.value]?.[0] : input.value;
      }
      try { return root.PaintPreferences.validate(value); }
      catch (error) { if (report) message(error.message); return null; }
    }
    function refreshLanguage() {
      if (!dialog.open) return;
      // Preserve invalid and unfinished values while translating the controls.
      const values = controls.map(({ input }) => [input.id, input.value, input.checked]); render();
      for (const [id, value, checked] of values) if ($(id)) { $(id).value = value; if ($(id).type === 'checkbox') $(id).checked = checked; }
      if (notice) message(notice);
    }
    $('preferencesButton').onclick = () => { session++; draft = root.PaintPreferences.validate(getValue()); message(null); render(); dialog.showModal(); };
    dialog.addEventListener('close', () => { session++; });
    $('closePreferences').onclick = () => dialog.close();
    $('cancelPreferences').onclick = () => dialog.close();
    $('resetPreferences').onclick = () => { draft = root.PaintPreferences.factory(); render(); message('preferences_factory_draft'); };
    $('savePreferences').onclick = () => { const value = collect(); if (value) { onSave(value); dialog.close(); } };
    $('exportPreferences').onclick = () => { const value = collect(); if (value) download('tinta-y-color.preferences.json', JSON.stringify(value, null, 2), 'application/json'); };
    $('importPreferences').onclick = () => $('preferencesFile').click();
    $('preferencesFile').onchange = async () => {
      const file = $('preferencesFile').files[0], request = session; $('preferencesFile').value = ''; if (!file) return;
      try { if (file.size > 65536) throw new Error('preferences_invalid'); const next = root.PaintPreferences.validate(JSON.parse(await file.text())); if (!dialog.open || request !== session) return; draft = next; render(); message('preferences_imported'); }
      catch (error) { if (dialog.open && request === session) message(error.message.startsWith('preferences_') ? error.message : 'preferences_invalid'); }
    };
    return { refreshLanguage };
  }
  root.PaintPreferencesEditor = { create };
})(typeof window === 'undefined' ? globalThis : window);
