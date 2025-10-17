// Utilities for pairing thermal (_T) images with RGB (_V) counterparts

import { getImageFilename } from "./imageUtils";

export const extractFilename = (item) => {
  if (item?.imageName) return item.imageName;
  return getImageFilename(item?.image || "");
};

export const isThermalFilename = (filename) =>
  /^(.*)_T\.(jpe?g|png)$/i.test(filename);
export const isRgbFilename = (filename) =>
  /^(.*)_V\.(jpe?g|png)$/i.test(filename);

export const getThermalBase = (filename) => {
  const m = filename.match(/^(.*)_T\.(jpe?g|png)$/i);
  return m ? m[1] : null;
};

export const getRgbBase = (filename) => {
  const m = filename.match(/^(.*)_V\.(jpe?g|png)$/i);
  return m ? m[1] : null;
};

// Return only thermal items from an items array
export const getThermalOnlyItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) return items;
  return items.filter((it) => isThermalFilename(extractFilename(it)));
};

// Pair thermal and rgb: [thermal, rgb?], keep thermal even if rgb missing
export const getPairedItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) return items;

  const rgbByBase = new Map();
  const usedRgbIds = new Set();

  for (const it of items) {
    const base = getRgbBase(extractFilename(it));
    if (base && !rgbByBase.has(base)) {
      rgbByBase.set(base, it);
    }
  }

  const result = [];
  for (const it of items) {
    const base = getThermalBase(extractFilename(it));
    if (!base) continue;
    const rgb = rgbByBase.get(base);
    result.push(it);
    if (rgb && !usedRgbIds.has(rgb.id)) {
      result.push(rgb);
      usedRgbIds.add(rgb.id);
    }
  }
  return result;
};

// Determine if any rgb counterpart exists among loaded items
export const hasAnyRgbPairForItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) return false;
  const basesT = new Set();
  const basesV = new Set();
  for (const it of items) {
    const filename = extractFilename(it);
    const t = getThermalBase(filename);
    const v = getRgbBase(filename);
    if (t) basesT.add(t);
    if (v) basesV.add(v);
  }
  for (const base of basesT) {
    if (basesV.has(base)) return true;
  }
  return false;
};
