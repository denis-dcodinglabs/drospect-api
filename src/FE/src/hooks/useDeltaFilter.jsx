import { useCallback, useEffect, useMemo, useState } from "react";

const PRESETS = {
  all: { key: "all", label: "All", min: 0, max: Infinity },
  "0-5": { key: "0-5", label: "0–5", min: 0, max: 5 },
  "5-10": { key: "5-10", label: "5–10", min: 5, max: 10 },
  "10-20": { key: "10-20", label: "10–20", min: 10, max: 20 },
  "20+": { key: "20+", label: "20+", min: 20, max: Infinity },
};

function parseNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export default function useDeltaFilter(projectId) {
  const [deltaMin, setDeltaMin] = useState(0);
  const [deltaMax, setDeltaMax] = useState(Infinity);
  const [activePreset, setActivePreset] = useState("all");

  const storageKey = useMemo(
    () => `deltaFilter:${projectId ?? "global"}`,
    [projectId],
  );

  const setPreset = useCallback((key) => {
    const preset = PRESETS[key] || PRESETS.all;
    setActivePreset(preset.key);
    setDeltaMin(preset.min);
    setDeltaMax(preset.max);
  }, []);

  const setCustom = useCallback((min, max) => {
    const nextMin = parseNumber(min, 0);
    const nextMax = max === Infinity ? Infinity : parseNumber(max, Infinity);
    setActivePreset("custom");
    setDeltaMin(nextMin);
    setDeltaMax(nextMax);
  }, []);

  const reset = useCallback(() => setPreset("all"), [setPreset]);

  const persist = useCallback(() => {
    const data = {
      deltaMin,
      deltaMax: deltaMax === Infinity ? "inf" : deltaMax,
      activePreset,
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch {}

    const url = new URL(window.location.href);
    url.searchParams.set("deltaMin", String(deltaMin));
    url.searchParams.set(
      "deltaMax",
      deltaMax === Infinity ? "inf" : String(deltaMax),
    );
    window.history.replaceState({}, "", url.toString());
  }, [deltaMin, deltaMax, activePreset, storageKey]);

  const loadFromUrlOrStorage = useCallback(() => {
    const url = new URL(window.location.href);
    const qpMin = url.searchParams.get("deltaMin");
    const qpMax = url.searchParams.get("deltaMax");

    if (qpMin !== null || qpMax !== null) {
      const min = parseNumber(qpMin, 0);
      const max = qpMax === "inf" ? Infinity : parseNumber(qpMax, Infinity);

      // try match preset first
      const matched = Object.values(PRESETS).find(
        (p) => p.min === min && p.max === max,
      );
      if (matched) {
        setPreset(matched.key);
      } else {
        setCustom(min, max);
      }
      return;
    }

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const data = JSON.parse(raw);
        const min = parseNumber(data?.deltaMin, 0);
        const max =
          data?.deltaMax === "inf"
            ? Infinity
            : parseNumber(data?.deltaMax, Infinity);
        const matched = Object.values(PRESETS).find(
          (p) => p.min === min && p.max === max,
        );
        if (matched) {
          setPreset(matched.key);
        } else {
          setCustom(min, max);
        }
      } else {
        setPreset("all");
      }
    } catch {
      setPreset("all");
    }
  }, [setCustom, setPreset, storageKey]);

  useEffect(() => {
    loadFromUrlOrStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    persist();
  }, [persist]);

  const inRange = useCallback(
    (value) => {
      if (!Number.isFinite(value)) return false;
      if (deltaMax === Infinity) return value >= deltaMin;
      return value >= deltaMin && value < deltaMax; // inclusive min, exclusive max
    },
    [deltaMin, deltaMax],
  );

  const matchesDelta = useCallback(
    (image) => {
      if (!Array.isArray(image?.panelInformation)) return false;
      return image.panelInformation.some((panel) =>
        inRange(Number(panel?.deltaTemp)),
      );
    },
    [inRange],
  );

  return {
    presets: PRESETS,
    deltaMin,
    deltaMax,
    activePreset,
    setPreset,
    setCustom,
    reset,
    matchesDelta,
  };
}
