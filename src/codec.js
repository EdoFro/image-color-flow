/* Mapas temporales y contribuciones tenues para la presentación autónoma. */
(function (root) {
  'use strict';
  function createPaintCodec() {
    function base64(bytes) {
      let text = ''; for (let i = 0; i < bytes.length; i += 24576) text += String.fromCharCode(...bytes.subarray(i, i + 24576)); return btoa(text);
    }
    function pack(field) {
      const times = field.fullTimes || field.times, scale = Math.max(.000001, field.duration) / 65534;
      const bytes = new Uint8Array(times.length * 2), view = new DataView(bytes.buffer);
      const encodeTime = t => Number.isFinite(t) ? Math.max(0, Math.min(65534, Math.round(t / scale))) : 65535;
      for (let i = 0; i < times.length; i++) view.setUint16(i * 2, encodeTime(times[i]), true);
      const accents = field.accents, extra = new Uint8Array((accents?.indices.length || 0) * 7), extraView = new DataView(extra.buffer);
      if (accents) for (let k = 0; k < accents.indices.length; k++) {
        extraView.setUint32(k * 7, accents.indices[k], true); extraView.setUint16(k * 7 + 4, encodeTime(accents.times[k]), true); extra[k * 7 + 6] = accents.opacity[k];
      }
      return { data: base64(bytes), accentData: base64(extra), scale, duration: field.duration, fade: field.fade, name: field.name,
        pauseAfter: field.pauseAfter, skipped: field.skipped, visualOnly: field.visualOnly, hold: field.hold, frame: field.frame, cameraDuration: field.cameraDuration, stageIndex: field.stageIndex,
        zoom: field.zoom, highlightEnabled: field.highlightEnabled, highlightLinked: field.highlightLinked, highlightFrame: field.highlightFrame,
        outside: field.outside, outsideColor: field.outsideColor, blur: field.blur };
    }
    function unpack(field, count) {
      const raw = atob(field.data); if (raw.length !== count * 2) throw new Error('Mapa de tiempos incompleto.');
      const times = new Float32Array(count), opacity = new Uint8Array(count);
      for (let i = 0; i < count; i++) { const value = raw.charCodeAt(i * 2) | raw.charCodeAt(i * 2 + 1) << 8; times[i] = value === 65535 ? Infinity : value * field.scale; if (value !== 65535) opacity[i] = 255; }
      const extra = atob(field.accentData || ''); if (extra.length % 7) throw new Error('Mapa de desvanecimiento incompleto.');
      const size = extra.length / 7, accents = { indices: new Uint32Array(size), times: new Float32Array(size), opacity: new Uint8Array(size) };
      for (let k = 0; k < size; k++) {
        const offset = k * 7, i = (extra.charCodeAt(offset) | extra.charCodeAt(offset + 1) << 8 | extra.charCodeAt(offset + 2) << 16 | extra.charCodeAt(offset + 3) << 24) >>> 0;
        if (i >= count) throw new Error('Píxel fuera del mapa de desvanecimiento.');
        accents.indices[k] = i; accents.times[k] = (extra.charCodeAt(offset + 4) | extra.charCodeAt(offset + 5) << 8) * field.scale; accents.opacity[k] = extra.charCodeAt(offset + 6);
        if (accents.opacity[k] > opacity[i]) opacity[i] = accents.opacity[k];
      }
      return { ...field, data: undefined, accentData: undefined, times, fullTimes: times, opacity, accents };
    }
    return { pack, unpack };
  }
  root.createPaintCodec = createPaintCodec; root.PaintCodec = createPaintCodec();
})(typeof window === 'undefined' ? globalThis : window);
