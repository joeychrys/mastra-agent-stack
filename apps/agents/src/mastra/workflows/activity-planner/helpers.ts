/** Maps Open-Meteo weather codes to human-readable condition strings. */
export function getWeatherCondition(code: number): string {
  const conditions: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    95: "Thunderstorm",
  };
  return conditions[code] || "Unknown";
}

/** Case-insensitive partial match. */
export function includes(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().trim().includes(needle.toLowerCase().trim());
}

/** Geocoding result shape from the Open-Meteo API. */
export type GeocodingResult = {
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
};

/**
 * Tries to auto-select a geocoding result using region/country context.
 * Returns the best match or null if no confident match is found.
 */
export function autoSelectCity(
  results: GeocodingResult[],
  region?: string,
  country?: string,
): GeocodingResult | null {
  if (!region && !country) return null;

  for (const r of results) {
    const regionMatch = !region || (r.admin1 && includes(r.admin1, region));
    const countryMatch = !country || includes(r.country, country);
    if (regionMatch && countryMatch) return r;
  }

  // Fallback: country-only match
  if (country) {
    for (const r of results) {
      if (includes(r.country, country)) return r;
    }
  }

  return null;
}
