export type Photo = {
  key: string;
  src: string;
  caption: string;
  ratio?: number;
  credit: string;
  license: string;
  source: string;
};

export type Place = {
  id: string;
  name: string;
  native: string;
  hue: string;
  altitude: number;
  coords: [number, number];
  tagline: string;
};
