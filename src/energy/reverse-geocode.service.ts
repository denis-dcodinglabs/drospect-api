import { Injectable } from "@nestjs/common";
import fetch from "node-fetch";
import { countries } from "countries-list";

const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY;

interface GeocodeCacheEntry {
  value: { country: string; continent: string };
  timestamp: number;
}

@Injectable()
export class ReverseGeocodeService {
  private cache: Map<string, GeocodeCacheEntry> = new Map();
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  async getCountryAndContinent(
    lat: number,
    lon: number,
  ): Promise<{ country: string; continent: string }> {
    const cacheKey = `${lat},${lon}`;
    const now = Date.now();
    const cached = this.cache.get(cacheKey);
    if (cached && now - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.value;
    }
    if (!GEOAPIFY_API_KEY) {
      throw new Error("Geoapify API key not set in GEOAPIFY_API_KEY");
    }
    const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${GEOAPIFY_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Geoapify API error: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    const props = data.features?.[0]?.properties;
    let country = props?.country;
    let continent = props?.continent;
    let countryCode = props?.country_code || props?.country_code_alpha2;
    if (!continent && countryCode) {
      countryCode = countryCode.toUpperCase();
      const countryData = countries[countryCode];
      if (countryData) {
        continent = countryData.continent;
        if (!country) country = countryData.name;
      } else {
        console.error(
          `[countries-list] No country data for code: ${countryCode}`,
          JSON.stringify(data, null, 2),
        );
      }
    }
    if (!country || !continent) {
      console.error(
        "[Geoapify/countries-list] Full API response for debugging:",
        JSON.stringify(data, null, 2),
      );
      throw new Error(
        "Could not determine country or continent from reverse geocode",
      );
    }
    const value = { country, continent };
    this.cache.set(cacheKey, { value, timestamp: now });
    return value;
  }
}
