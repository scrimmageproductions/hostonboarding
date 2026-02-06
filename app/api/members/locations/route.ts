import { parseGvizJson } from "@/app/lib/gviz-parser";
import { NextResponse } from "next/server";
import { cacheGet, cacheSet, CACHE_TTL } from "@/app/api/lib/cache";

export const runtime = "nodejs";

const SHEET_ID = "16BBOfasVwz8L6fPMungz_Y0EfF6Z9puskLAix3tCHzM";
const TAB_NAME = "Crew";

function gvizUrl(sheetId: string, tabName?: string) {
  const url = new URL(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq`);
  url.searchParams.set("tqx", "out:json");
  if (tabName) url.searchParams.set("sheet", tabName);
  url.searchParams.set("headers", "0");
  return url.toString();
}

type MemberLocation = {
  id: number;
  name: string;
  city: string;
  country?: string;
  lat?: number;
  lng?: number;
  turtles: string[];
  skills: string[];
  orgs: string[];
  pizzaToppings?: string;
};

// City coordinates (approximate) - we'll geocode as many as possible
const CITY_COORDS: Record<string, { lat: number; lng: number; country: string }> = {
  "new york": { lat: 40.7128, lng: -74.0060, country: "USA" },
  "san francisco": { lat: 37.7749, lng: -122.4194, country: "USA" },
  "los angeles": { lat: 34.0522, lng: -118.2437, country: "USA" },
  "chicago": { lat: 41.8781, lng: -87.6298, country: "USA" },
  "seattle": { lat: 47.6062, lng: -122.3321, country: "USA" },
  "austin": { lat: 30.2672, lng: -97.7431, country: "USA" },
  "boston": { lat: 42.3601, lng: -71.0589, country: "USA" },
  "denver": { lat: 39.7392, lng: -104.9903, country: "USA" },
  "miami": { lat: 25.7617, lng: -80.1918, country: "USA" },
  "portland": { lat: 45.5152, lng: -122.6784, country: "USA" },
  "washington": { lat: 38.9072, lng: -77.0369, country: "USA" },
  "atlanta": { lat: 33.7490, lng: -84.3880, country: "USA" },
  "dallas": { lat: 32.7767, lng: -96.7970, country: "USA" },
  "houston": { lat: 29.7604, lng: -95.3698, country: "USA" },
  "phoenix": { lat: 33.4484, lng: -112.0740, country: "USA" },
  "philadelphia": { lat: 39.9526, lng: -75.1652, country: "USA" },
  "san diego": { lat: 32.7157, lng: -117.1611, country: "USA" },
  "nashville": { lat: 36.1627, lng: -86.7816, country: "USA" },
  "london": { lat: 51.5074, lng: -0.1278, country: "UK" },
  "paris": { lat: 48.8566, lng: 2.3522, country: "France" },
  "berlin": { lat: 52.5200, lng: 13.4050, country: "Germany" },
  "amsterdam": { lat: 52.3676, lng: 4.9041, country: "Netherlands" },
  "barcelona": { lat: 41.3851, lng: 2.1734, country: "Spain" },
  "madrid": { lat: 40.4168, lng: -3.7038, country: "Spain" },
  "rome": { lat: 41.9028, lng: 12.4964, country: "Italy" },
  "lisbon": { lat: 38.7223, lng: -9.1393, country: "Portugal" },
  "tokyo": { lat: 35.6762, lng: 139.6503, country: "Japan" },
  "singapore": { lat: 1.3521, lng: 103.8198, country: "Singapore" },
  "hong kong": { lat: 22.3193, lng: 114.1694, country: "Hong Kong" },
  "sydney": { lat: -33.8688, lng: 151.2093, country: "Australia" },
  "melbourne": { lat: -37.8136, lng: 144.9631, country: "Australia" },
  "toronto": { lat: 43.6532, lng: -79.3832, country: "Canada" },
  "vancouver": { lat: 49.2827, lng: -123.1207, country: "Canada" },
  "montreal": { lat: 45.5017, lng: -73.5673, country: "Canada" },
  "mexico city": { lat: 19.4326, lng: -99.1332, country: "Mexico" },
  "buenos aires": { lat: -34.6037, lng: -58.3816, country: "Argentina" },
  "sao paulo": { lat: -23.5505, lng: -46.6333, country: "Brazil" },
  "rio de janeiro": { lat: -22.9068, lng: -43.1729, country: "Brazil" },
  "bogota": { lat: 4.7110, lng: -74.0721, country: "Colombia" },
  "santiago": { lat: -33.4489, lng: -70.6693, country: "Chile" },
  "lima": { lat: -12.0464, lng: -77.0428, country: "Peru" },
  "bangkok": { lat: 13.7563, lng: 100.5018, country: "Thailand" },
  "mumbai": { lat: 19.0760, lng: 72.8777, country: "India" },
  "delhi": { lat: 28.7041, lng: 77.1025, country: "India" },
  "bangalore": { lat: 12.9716, lng: 77.5946, country: "India" },
  "dubai": { lat: 25.2048, lng: 55.2708, country: "UAE" },
  "tel aviv": { lat: 32.0853, lng: 34.7818, country: "Israel" },
  "istanbul": { lat: 41.0082, lng: 28.9784, country: "Turkey" },
  "moscow": { lat: 55.7558, lng: 37.6173, country: "Russia" },
  "zurich": { lat: 47.3769, lng: 8.5417, country: "Switzerland" },
  "stockholm": { lat: 59.3293, lng: 18.0686, country: "Sweden" },
  "copenhagen": { lat: 55.6761, lng: 12.5683, country: "Denmark" },
  "oslo": { lat: 59.9139, lng: 10.7522, country: "Norway" },
  "helsinki": { lat: 60.1699, lng: 24.9384, country: "Finland" },
  "vienna": { lat: 48.2082, lng: 16.3738, country: "Austria" },
  "prague": { lat: 50.0755, lng: 14.4378, country: "Czech Republic" },
  "budapest": { lat: 47.4979, lng: 19.0402, country: "Hungary" },
  "warsaw": { lat: 52.2297, lng: 21.0122, country: "Poland" },
  "dublin": { lat: 53.3498, lng: -6.2603, country: "Ireland" },
  "edinburgh": { lat: 55.9533, lng: -3.1883, country: "Scotland" },
  "manchester": { lat: 53.4808, lng: -2.2426, country: "UK" },
  "brussels": { lat: 50.8503, lng: 4.3517, country: "Belgium" },
  "luxembourg": { lat: 49.6116, lng: 6.1319, country: "Luxembourg" },
};

function normalizeCity(city: string): string {
  return city
    .toLowerCase()
    .trim()
    .replace(/[,\(\)]/g, "")
    .replace(/\s+/g, " ");
}

function getCityCoordinates(city: string): { lat: number; lng: number; country: string } | null {
  const normalized = normalizeCity(city);

  // Direct match
  if (CITY_COORDS[normalized]) {
    return CITY_COORDS[normalized];
  }

  // Try to match the first part (e.g., "New York, NY" -> "new york")
  const firstPart = normalized.split(/[\s,]+/)[0];
  for (const [key, value] of Object.entries(CITY_COORDS)) {
    if (key.startsWith(firstPart) || normalized.includes(key)) {
      return value;
    }
  }

  return null;
}

export async function GET() {
  try {
    const cacheKey = "members-locations:v1";

    const cached = await cacheGet<{ members: MemberLocation[] }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const url = gvizUrl(SHEET_ID, TAB_NAME);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch sheet");

    const text = await res.text();
    const gviz = parseGvizJson(text);
    const rows = gviz?.table?.rows || [];

    let headerRowIdx = -1;
    let headerRowVals: string[] = [];

    for (let ri = 0; ri < Math.min(rows.length, 100); ri++) {
      const rowCells = rows[ri]?.c || [];
      const rowVals = rowCells.map((c: any) => String(c?.v || c?.f || "").trim().toLowerCase());

      const hasName = rowVals.includes("name");
      const hasCity = rowVals.includes("city");

      if (hasName && hasCity) {
        headerRowIdx = ri;
        headerRowVals = rowCells.map((c: any) => String(c?.v || c?.f || "").trim());
        break;
      }
    }

    if (headerRowIdx === -1) {
      throw new Error("Could not find header row");
    }

    const headerMap = new Map<string, number>();
    headerRowVals.forEach((h, i) => {
      if (h) headerMap.set(h.toLowerCase(), i);
    });

    const idIdx = headerMap.get("id") ?? headerMap.get("#") ?? 0;
    const nameIdx = headerMap.get("name") ?? -1;
    const cityIdx = headerMap.get("city") ?? -1;
    const turtlesIdx = headerMap.get("turtles") ?? headerMap.get("roles") ?? -1;
    const skillsIdx = headerMap.get("skills") ?? headerMap.get("specialties") ?? -1;
    const orgsIdx = headerMap.get("orgs") ?? headerMap.get("affiliation") ?? -1;
    const pizzaIdx = headerMap.get("pizza") ?? headerMap.get("favorite pizza") ?? headerMap.get("pizza toppings") ?? -1;
    const statusIdx = headerMap.get("status") ?? headerMap.get("frequency") ?? -1;

    const members: MemberLocation[] = [];
    const dataStartIdx = headerRowIdx + 1;

    for (let ri = dataStartIdx; ri < rows.length; ri++) {
      const row = rows[ri];
      const cells = row?.c || [];

      const id = parseInt(String(cells[idIdx]?.v || ""), 10);
      const name = String(cells[nameIdx]?.v || "").trim();
      const city = String(cells[cityIdx]?.v || "").trim();
      const status = String(cells[statusIdx]?.v || "").trim().toLowerCase();

      if (!name || !city || !id || isNaN(id)) continue;

      // Skip inactive members
      if (status === "inactive" || status === "left") continue;

      const coords = getCityCoordinates(city);

      const turtles = turtlesIdx !== -1
        ? String(cells[turtlesIdx]?.v || "")
            .split(/[,/]+/)
            .map(t => t.trim())
            .filter(Boolean)
        : [];

      const skills = skillsIdx !== -1
        ? String(cells[skillsIdx]?.v || "")
            .split(/[,/]+/)
            .map(s => s.trim())
            .filter(Boolean)
        : [];

      const orgs = orgsIdx !== -1
        ? String(cells[orgsIdx]?.v || "")
            .split(/[,/]+/)
            .map(o => o.trim())
            .filter(Boolean)
        : [];

      const pizzaToppings = pizzaIdx !== -1 ? String(cells[pizzaIdx]?.v || "").trim() : undefined;

      members.push({
        id,
        name,
        city,
        lat: coords?.lat,
        lng: coords?.lng,
        country: coords?.country,
        turtles,
        skills,
        orgs,
        pizzaToppings,
      });
    }

    const result = { members };
    await cacheSet(cacheKey, result, CACHE_TTL.MEMBERS);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load members" },
      { status: 500 }
    );
  }
}
