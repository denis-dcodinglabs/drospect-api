import { DEFECT_LOSS_MAP } from "./defect-loss-map";

export interface PanelDefect {
  defectType: string; // e.g. 'Diode (one bypass diode failed shorted)'
  count: number; // number of modules with this defect
  capacityW: number; // module capacity in Watts
}

export interface EnergyLossResult {
  defectType: string;
  count: number;
  capacityW: number;
  outputLoss: number;
  energyLossKWh: number;
  revenueLossEur?: number;
}

/**
 * Calculate energy loss (and optionally revenue loss) for a list of panel defects.
 * @param defects List of panel defects
 * @param irradianceKwhPerM2PerYear Annual irradiance (NASA, kWh/m²/year)
 * @param pricePerKwh Optional price per kWh (for revenue loss)
 * @returns Array of results per defect
 */
export function calculateEnergyLoss(
  defects: PanelDefect[],
  irradianceKwhPerM2PerYear: number,
  pricePerKwh?: number,
): EnergyLossResult[] {
  return defects.map((defect) => {
    const outputLoss = DEFECT_LOSS_MAP[defect.defectType] ?? 0;
    const capacityKW = defect.capacityW / 1000;
    const energyLossKWh =
      defect.count * capacityKW * irradianceKwhPerM2PerYear * outputLoss;
    const revenueLossEur =
      pricePerKwh !== undefined ? energyLossKWh * pricePerKwh : undefined;
    return {
      defectType: defect.defectType,
      count: defect.count,
      capacityW: defect.capacityW,
      outputLoss,
      energyLossKWh,
      revenueLossEur,
    };
  });
}
