// GeoJSON types for ETS events
export interface ETSEventProperties {
  depth: number;
  duration: number;
  energy: number;
  id: number;
  magnitude: number;
  num_stas: number;
  time: string;
}

export interface ETSEvent {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: ETSEventProperties;
}

export interface ETSEventCollection {
  type: 'FeatureCollection';
  features: ETSEvent[];
}

// Parsed event with Date object for easier handling
export interface ParsedETSEvent extends ETSEvent {
  parsedTime: Date;
}