import { Injectable } from "@nestjs/common";
import fetch from "node-fetch";

interface IrradianceCacheEntry {
  value: number;
  timestamp: number;
}

@Injectable()
export class NasaIrradianceService {
  private cache: Map<string, IrradianceCacheEntry> = new Map();
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Get annual average solar irradiance (kWh/m²/year) for given coordinates.
   * @param latitude Latitude
   * @param longitude Longitude
   * @returns Irradiance in kWh/m²/year
   */
  async getAnnualIrradiance(
    latitude: number,
    longitude: number,
  ): Promise<number> {
    const cacheKey = `${latitude},${longitude}`;
    const now = Date.now();
    const cached = this.cache.get(cacheKey);
    if (cached && now - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.value;
    }
    const url = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude=${longitude}&latitude=${latitude}&format=JSON`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`NASA API error: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    const ann = data?.properties?.parameter?.ALLSKY_SFC_SW_DWN?.ANN;
    if (typeof ann !== "number") {
      throw new Error("NASA API response missing ANN value");
    }
    const annualIrradiance = ann * 365;
    this.cache.set(cacheKey, { value: annualIrradiance, timestamp: now });
    return annualIrradiance;
  }
}
