export type Player = {
  id: string;
  name: string;
  color: string;
  gold: number;
};


export type Province = {
  id: string | number; // GeoJSON IDs can be strings or numbers
  name: string;
  ownerId: string | null;
  color: string; // Neutral/Natural color
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  feature: any; // Storing the GeoJSON feature for D3 to render
  center: [number, number]; // Centroid for labels
  neighbors: (string | number)[];
  resources: {
    population: number;
    defense: number;
  };
};


export type MapTheme = "classic" | "cyberpunk" | "parchment" | "blueprint";

export type GameState = {
  turn: number;
  players: Record<string, Player>;
  provinces: Province[];
  selectedProvinceId: number | null;
  theme: MapTheme;
};

