// Tipos principales de CarpCast 2.0

// Datos meteorológicos
export interface WeatherData {
  time: string;
  temperature: number;
  windSpeed: number;
  windDirection: number;
  cloudCover: number;
  precipitation: number;
  humidity: number;
  pressure: number;
  visibility: number;
  uvIndex: number;
  gustSpeed: number;
}

// Datos marinos
export interface MarineData {
  time: string;
  waveHeight: number;
  wavePeriod: number;
  waveDirection: number;
  swellHeight: number;
  swellPeriod: number;
  swellDirection: number;
  currentSpeed: number;
  currentDirection: number;
}

// Datos astronómicos
export interface AstroData {
  sunrise: string;
  sunset: string;
  moonrise?: string;
  moonset?: string;
  moonPhase: number;
  moonIllumination: number;
}

// Datos hidrológicos
export interface HydroData {
  waterLevel?: number;
  waterFlow?: number;
  waterTemp?: number;
  provider: string;
  lastUpdate: string;
}

// Proveedores de datos hidrológicos
export interface HydroProvider {
  name: string;
  regions: string[];
  dataTypes: string[];
  apiUrl: string;
  rateLimit: number;
  supports(lat: number, lng: number): boolean;
  fetch(lat: number, lng: number): Promise<HydroData | null>;
}

// Respuesta de la API de Open-Meteo
export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  hourly: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    precipitation_probability: number[];
    precipitation: number[];
    rain: number[];
    snow: number[];
    weather_code: number[];
    cloud_cover: number[];
    cloud_cover_low: number[];
    cloud_cover_mid: number[];
    cloud_cover_high: number[];
    visibility: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    wind_gusts_10m: number[];
    uv_index: number[];
    surface_pressure: number[];
  };
  marine?: {
    time: string[];
    wave_height: number[];
    wave_direction: number[];
    wave_period: number[];
    swell_wave_height: number[];
    swell_wave_direction: number[];
    swell_wave_period: number[];
    ocean_current_velocity: number[];
    ocean_current_direction: number[];
  };
}

// Respuesta de geocodificación
export interface NominatimResponse {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}

// Ubicación
export interface Location {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

// Datos de ubicación para el mapa
export interface LocationData {
  latitude: number;
  longitude: number;
  name: string;
}

// Puntuación de actividad
export interface ActivityScore {
  overall: number;
  factors: {
    weather: number;
    astronomy: number;
    pressure: number;
    wind: number;
    moon: number;
    hydro?: number;
  };
  reasons: string[];
  bestWindows: {
    start: string;
    end: string;
    score: number;
    reason: string;
  }[];
  recommendation: string;
  confidence: number;

  // Desglose opcional (nuevo modelo por especie)
  breakdown?: ScoreBreakdown;
}

export interface DerivedWeatherFeatures {
  deltaPressure1h?: number;
  deltaPressure3hAvg?: number;
  deltaTemp1h?: number;
  rainPrev6h?: number;
  rainSum24h?: number;
  windStability3h?: number; // 0..1
}

export interface ScoreBreakdown {
  subscores: {
    meteo: number;
    astro: number;
    hydro?: number;
    marine?: number;
  };
  meteoModel?: {
    wNorm?: number; // 0..1
    cNorm?: number; // 0..1
    mix?: { w: number; c: number };
  };
  weightsUsed: {
    meteo: number;
    astro: number;
    hydro: number;
    marine: number;
  };
  bioMultipliers?: {
    seasonFactor?: number;
    spawnPenalty?: number;
    nightFactor?: number;
  };
}

// Datos completos del pronóstico
export interface ForecastData {
  time: string;
  weather: WeatherData;
  marine?: MarineData;
  astronomy: AstroData;
  hydro?: HydroData;
  activity: ActivityScore;
  location: Location;
}

// Lugar favorito
export interface FavoriteSpot {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
  notes?: string;
  tags?: string[];
  species?: string[];
  rating?: number;
  lastVisit?: string;
  createdAt: string;
  updatedAt: string;
}

// Alerta
export interface Alert {
  id: string;
  spotId: string;
  type: 'weather' | 'activity' | 'custom';
  condition: {
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    value: number;
  };
  isActive: boolean;
  lastTriggered?: string;
  createdAt: string;
}

// Respuesta de API estándar
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Modalidad de pesca
export type FishingMode = 'carpfishing' | 'predator';

// Especies objetivo (para selector UI / query param)
export type FishSpecies = 'general' | 'carp' | 'barbel' | 'bass' | 'pike' | 'catfish';

// Estados de carga
export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
  progress?: number;
}