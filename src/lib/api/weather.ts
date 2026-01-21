// Cliente para Open-Meteo Weather API (Gratuito, sin API key)
import axios from 'axios';
import type { OpenMeteoResponse, WeatherData, MarineData } from '@/types';

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1';

// Rate limiting: Open-Meteo es bastante generoso, pero mantenemos 1 req/sec
const rateLimiter = {
  lastRequest: 0,
  minInterval: 1000, // 1 second
};

async function waitForRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - rateLimiter.lastRequest;
  
  if (timeSinceLastRequest < rateLimiter.minInterval) {
    await new Promise(resolve => 
      setTimeout(resolve, rateLimiter.minInterval - timeSinceLastRequest)
    );
  }
  
  rateLimiter.lastRequest = Date.now();
}

export class OpenMeteoClient {
  static async getForecast(
    latitude: number,
    longitude: number,
    days: number = 7
  ): Promise<WeatherData[]> {
    await waitForRateLimit();
    
    const hourlyParams = [
      'temperature_2m',
      'relative_humidity_2m', 
      'precipitation',
      'cloud_cover',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
      'pressure_msl'
    ].join(',');

    const params = {
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      hourly: hourlyParams,
      timezone: 'auto',
      forecast_days: days.toString(),
    };

    try {
      const response = await axios.get<OpenMeteoResponse>(`${OPEN_METEO_BASE}/forecast`, {
        params,
        timeout: 10000,
      });

      return this.transformWeatherData(response.data);
    } catch (error) {
      console.error('Open-Meteo weather API error:', error);
      throw new Error('Failed to fetch weather data');
    }
  }

  static async getMarineData(
    latitude: number,
    longitude: number,
    days: number = 7
  ): Promise<MarineData[]> {
    await waitForRateLimit();
    
    const hourlyParams = [
      'wave_height',
      'wave_direction', 
      'wave_period',
      'wind_wave_height',
      'swell_wave_height'
    ].join(',');

    const params = {
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      hourly: hourlyParams,
      timezone: 'auto',
      forecast_days: days.toString(),
    };

    try {
      const response = await axios.get(`${OPEN_METEO_BASE}/marine`, {
        params,
        timeout: 10000,
      });

      return this.transformMarineData(response.data);
    } catch (error) {
      console.warn('Marine data not available for this location:', error);
      return []; // Degradar elegantemente
    }
  }

  private static transformWeatherData(data: OpenMeteoResponse): WeatherData[] {
    const { hourly } = data;
    
    if (!hourly || !hourly.time || !Array.isArray(hourly.time)) {
      console.warn('Invalid weather data structure:', data);
      return [];
    }
    
    return hourly.time.map((time, index) => ({
      time: time,
      temperature: hourly.temperature_2m?.[index] || 0,
      windSpeed: hourly.wind_speed_10m?.[index] || 0,
      windDirection: hourly.wind_direction_10m?.[index] || 0,
      cloudCover: hourly.cloud_cover?.[index] || 0,
      precipitation: hourly.precipitation?.[index] || 0,
      humidity: hourly.relative_humidity_2m?.[index] || 0,
      pressure: hourly.pressure_msl?.[index] || 1013.25,
      visibility: hourly.visibility?.[index] || 10000, // Default 10km
      uvIndex: hourly.uv_index?.[index] || 0,
      gustSpeed: hourly.wind_gusts_10m?.[index] || 0,
    }));
  }

  private static transformMarineData(data: any): MarineData[] {
    if (!data.hourly) return [];
    
    const { hourly } = data;
    
    return hourly.time.map((time: string, index: number) => ({
      waveHeight: hourly.wave_height?.[index],
      waveDirection: hourly.wave_direction?.[index],
      wavePeriod: hourly.wave_period?.[index],
      swellHeight: hourly.swell_wave_height?.[index],
    }));
  }
}

// Ejemplo de request URL que genera esta clase:
/*
https://api.open-meteo.com/v1/forecast?latitude=40.7128&longitude=-74.0060&hourly=temperature_2m,relative_humidity_2m,precipitation,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl&timezone=auto&forecast_days=7
*/