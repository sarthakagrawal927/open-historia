import * as topojson from "topojson-client";
import { Province } from "./types";

// ISO 3166-1 numeric code mapping for some major countries
const COUNTRY_NAMES: Record<string, string> = {
  "032": "Argentina", "036": "Australia", "076": "Brazil", "124": "Canada",
  "156": "China", "250": "France", "276": "Germany", "356": "India",
  "360": "Indonesia", "380": "Italy", "392": "Japan", "484": "Mexico",
  "643": "Russia", "682": "Saudi Arabia", "710": "South Africa",
  "724": "Spain", "792": "Turkey", "826": "United Kingdom", "840": "USA"
};

export async function loadWorldData(): Promise<Province[]> {
  try {
    const response = await fetch("/world-110m.json");
    if (!response.ok) throw new Error("Failed to load map data");
    
    const topology = await response.json();
    
    // Convert TopoJSON to GeoJSON features
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const geojson = topojson.feature(topology, topology.objects.countries) as any;
    

    // Map features to our Province format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const provinces: Province[] = geojson.features
        .filter((feature: any) => feature.id !== "010" && feature.id !== 10) // Exclude Antarctica
        .map((feature: any, index: number) => {
       const id = feature.id ? String(feature.id).padStart(3, '0') : String(index);
       const name = COUNTRY_NAMES[id] || `Region ${id}`;
       
       // Generate a random vibrant color
       const hue = Math.floor(Math.random() * 360);
       const color = `hsl(${hue}, 60%, 50%)`; // More vibrant
       
       return {
         id,
         name,
         ownerId: null, 
         color,
         feature,
         center: [0, 0], // Placeholder, calculated in UI or with d3-geo
         neighbors: [], // Neighbor calculation is expensive, skipping for V1
         resources: {
           population: Math.floor(Math.random() * 100) + 10, // millions?
           defense: Math.floor(Math.random() * 10) + 1
         }
       };
    });

    return provinces;
  } catch (error) {
    console.error("Map loading error:", error);
    return [];
  }
}
