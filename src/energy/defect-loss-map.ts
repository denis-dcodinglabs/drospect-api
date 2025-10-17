// Hardcoded mapping of defect types to output loss percentages (fractional)
// Source: energy_calculation_loss.txt

export const DEFECT_LOSS_MAP: Record<string, number> = {
  "Cell (single hot-spotted cell)": 0.05,
  "Cell-Multi (2–3 hot-spotted cells)": 0.1,
  "Cracking / micro-cracks (moderate)": 0.2,
  "Diode (one bypass diode failed shorted)": 0.33,
  "Diode-Multi (two diodes failed)": 0.66,
  "Hot-Spot (isolated)": 0.05,
  "Hot-Spot-Multi": 0.1,
  "Shadowing (string-level partial shade)": 0.15,
  "Soiling (average U.S. sites, rain-washed)": 0.1,
  "Vegetation (ground-level brush / weeds)": 0.2,
  Unhealthy: 0.2,
};
