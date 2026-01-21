// Cliente para datos astronómicos usando USNO y APIs alternativas gratuitas
import axios from 'axios';
import type { AstroData } from '@/types';

const USNO_BASE = 'https://aa.usno.navy.mil/api';
const SUNRISE_SUNSET_BASE = 'https://api.sunrise-sunset.org';
const FARMSENSE_BASE = 'https://api.farmsense.net/v1';

export class AstroClient {
  // Función principal que intenta USNO primero, luego fallback
  static async getAstronomicalData(
    latitude: number,
    longitude: number,
    date: Date = new Date()
  ): Promise<AstroData> {
    try {
      // Intentar USNO primero (más completo)
      return await this.getUSNOData(latitude, longitude, date);
    } catch (error) {
      console.warn('USNO API failed, using fallback providers:', error);
      // Fallback: combinar sunrise-sunset + farmsense
      return await this.getFallbackAstroData(latitude, longitude, date);
    }
  }

  // USNO Astronomical Applications API
  private static async getUSNOData(
    latitude: number,
    longitude: number,
    date: Date
  ): Promise<AstroData> {
    const dateStr = date.toISOString().split('T')[0];
    
    // Calcular timezone offset para USNO (east-positive)
    const timezoneOffset = -date.getTimezoneOffset() / 60;
    
    const params = {
      date: dateStr,
      coords: `${latitude},${longitude}`,
      tz: timezoneOffset.toString(),
    };

    const [sunResponse, moonResponse] = await Promise.allSettled([
      axios.get(`${USNO_BASE}/rstt/oneday`, { params, timeout: 8000 }),
      axios.get(`${USNO_BASE}/moon/phases/date`, { 
        params: { date: dateStr }, 
        timeout: 8000 
      }),
    ]);

    let sunData = null;
    let moonData = null;

    if (sunResponse.status === 'fulfilled') {
      sunData = sunResponse.value.data;
    }

    if (moonResponse.status === 'fulfilled') {
      moonData = moonResponse.value.data;
    }

    // Si no conseguimos datos básicos del sol, usar fallback
    if (!sunData?.sundata) {
      console.warn('USNO sun data unavailable, using fallback calculation');
      return this.calculateSunTimesWithFallback(lat, lng, date);
    }

    return {
      sunrise: this.parseUSNOTime(sunData.sundata.find((s: any) => s.phen === 'Rise')?.time) || '06:00',
      sunset: this.parseUSNOTime(sunData.sundata.find((s: any) => s.phen === 'Set')?.time) || '18:00',
      moonrise: this.parseUSNOTime(sunData.moondata?.find((m: any) => m.phen === 'Rise')?.time),
      moonset: this.parseUSNOTime(sunData.moondata?.find((m: any) => m.phen === 'Set')?.time),
      moonPhase: this.calculateMoonPhase(moonData),
      moonIllumination: moonData?.curphase || 50, // Default if not available
    };
  }

  // Fallback usando APIs alternativas gratuitas
  private static async getFallbackAstroData(
    latitude: number,
    longitude: number,
    date: Date
  ): Promise<AstroData> {
    const dateStr = date.toISOString().split('T')[0];
    
    const [sunPromise, moonPromise] = await Promise.allSettled([
      this.getSunriseSunsetData(latitude, longitude, dateStr),
      this.getMoonPhaseData(date),
    ]);

    let sunData = null;
    let moonData = null;

    if (sunPromise.status === 'fulfilled') {
      sunData = sunPromise.value;
    }

    if (moonPromise.status === 'fulfilled') {
      moonData = moonPromise.value;
    }

    if (!sunData) {
      throw new Error('All astronomical APIs failed');
    }

    return {
      sunrise: sunData.sunrise,
      sunset: sunData.sunset,
      moonrise: undefined, // sunrise-sunset.org no incluye moonrise/set
      moonset: undefined,
      moonPhase: moonData?.Phase || 0,
      moonIllumination: (moonData?.Illumination || 0) * 100,
    };
  }

  // sunrise-sunset.org API (Gratuito, requiere atribución)
  private static async getSunriseSunsetData(
    latitude: number,
    longitude: number,
    date: string
  ) {
    const response = await axios.get(`${SUNRISE_SUNSET_BASE}/json`, {
      params: {
        lat: latitude,
        lng: longitude,
        date: date,
        formatted: 0, // ISO format
      },
      timeout: 8000,
    });

    if (response.data.status !== 'OK') {
      throw new Error('Sunrise-sunset API error: ' + response.data.status);
    }

    return {
      sunrise: response.data.results.sunrise,
      sunset: response.data.results.sunset,
    };
  }

  // FarmSense Moon Phases API (Gratuito)
  private static async getMoonPhaseData(date: Date) {
    // Convertir a timestamp de mediodía local para consistencia
    const noon = new Date(date);
    noon.setHours(12, 0, 0, 0);
    const timestamp = Math.floor(noon.getTime() / 1000);

    const response = await axios.get(`${FARMSENSE_BASE}/moonphases/`, {
      params: { d: timestamp },
      timeout: 8000,
    });

    return response.data[0]; // Retorna el primer resultado
  }

  // Helpers
  private static calculateSunTimesWithFallback(lat: number, lng: number, date: Date): AstronomyData {
    // Simple solar calculation for fallback
    const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
    const solarDeclination = 23.45 * Math.sin((360 * (284 + dayOfYear) / 365) * Math.PI / 180);
    const hourAngle = Math.acos(-Math.tan(lat * Math.PI / 180) * Math.tan(solarDeclination * Math.PI / 180));
    const sunriseHour = 12 - (hourAngle * 180 / Math.PI) / 15 - lng / 15;
    const sunsetHour = 12 + (hourAngle * 180 / Math.PI) / 15 - lng / 15;

    const formatTime = (hour: number) => {
      const h = Math.floor(hour);
      const m = Math.floor((hour - h) * 60);
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    return {
      sunrise: formatTime(sunriseHour),
      sunset: formatTime(sunsetHour),
      moonrise: null,
      moonset: null,
      moonPhase: 'Unknown',
      moonIllumination: 50,
    };
  }

  private static parseUSNOTime(timeStr: string | undefined): string | undefined {
    if (!timeStr) return undefined;
    
    // USNO devuelve formato "HH:MM" en timezone local
    const today = new Date();
    const [hours, minutes] = timeStr.split(':').map(Number);
    const result = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
    
    return result.toISOString();
  }

  private static calculateMoonPhase(moonData: any): number {
    if (!moonData?.curphase) return 0;
    
    // Convertir descripción de fase a valor numérico (0-1)
    const phaseMap: { [key: string]: number } = {
      'New Moon': 0,
      'First Quarter': 0.25,
      'Full Moon': 0.5,
      'Last Quarter': 0.75,
    };

    return phaseMap[moonData.curphase] || 0;
  }
}

// Ejemplos de URLs que genera esta clase:
/*
USNO: https://aa.usno.navy.mil/api/rstt/oneday?date=2024-01-20&coords=40.7128,-74.0060&tz=-5
Sunrise-Sunset: https://api.sunrise-sunset.org/json?lat=40.7128&lng=-74.0060&date=2024-01-20&formatted=0
FarmSense: https://api.farmsense.net/v1/moonphases/?d=1705766400
*/