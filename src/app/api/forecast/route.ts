// Endpoint principal para obtener pronóstico de actividad de pesca
import { NextRequest, NextResponse } from 'next/server';
import { OpenMeteoClient } from '@/lib/api/weather';
import { AstroClient } from '@/lib/api/astronomy';
import { HydroManager } from '@/lib/api/hydro';
import { ActivityScoring } from '@/lib/scoring';
import type { ForecastData, FishingMode, FishSpecies, WeatherData, DerivedWeatherFeatures } from '@/types';

function normalizeSpecies(input: string | null): FishSpecies {
  const s = (input || 'general').toLowerCase().trim();
  if (s === 'general' || s === 'all' || s === 'any') return 'general';

  // Aceptar variantes ES/EN + typos frecuentes
  if (s === 'carpa' || s === 'carp') return 'carp';
  if (s === 'barbo' || s === 'barbel') return 'barbel';
  if (s === 'blackbass' || s === 'bass' || s === 'black_bass') return 'bass';
  if (s === 'lucio' || s === 'pike') return 'pike';
  if (s === 'siluro' || s === 'sirulo' || s === 'catfish') return 'catfish';

  return 'general';
}

function computeDerivedFeatures(weatherData: WeatherData[], index: number): DerivedWeatherFeatures {
  const w = weatherData[index];

  const prev1 = index - 1 >= 0 ? weatherData[index - 1] : undefined;
  const prev3 = index - 3 >= 0 ? weatherData[index - 3] : undefined;

  const deltaPressure1h = prev1 ? w.pressure - prev1.pressure : undefined;
  const deltaTemp1h = prev1 ? w.temperature - prev1.temperature : undefined;

  let deltaPressure3hAvg: number | undefined;
  if (prev3 && index - 1 >= 0) {
    const deltas: number[] = [];
    for (let i = index - 3; i <= index; i++) {
      if (i - 1 < 0) continue;
      deltas.push(weatherData[i].pressure - weatherData[i - 1].pressure);
    }
    if (deltas.length > 0) {
      deltaPressure3hAvg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    }
  }

  const sumPrecip = (fromInclusive: number, toInclusive: number) => {
    let sum = 0;
    for (let i = Math.max(0, fromInclusive); i <= Math.min(weatherData.length - 1, toInclusive); i++) {
      sum += weatherData[i]?.precipitation || 0;
    }
    return sum;
  };

  const rainPrev6h = index - 1 >= 0 ? sumPrecip(index - 6, index - 1) : undefined;
  const rainSum24h = index - 1 >= 0 ? sumPrecip(index - 24, index - 1) : undefined;

  let windStability3h: number | undefined;
  if (index - 2 >= 0) {
    const speeds = [weatherData[index - 2].windSpeed, weatherData[index - 1].windSpeed, weatherData[index].windSpeed];
    const avg = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const variance = speeds.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / speeds.length;
    const std = Math.sqrt(variance);
    windStability3h = Math.max(0, Math.min(1, 1 - std / Math.max(1, avg)));
  }

  return {
    deltaPressure1h,
    deltaPressure3hAvg,
    deltaTemp1h,
    rainPrev6h,
    rainSum24h,
    windStability3h,
  };
}

// Cache simple en memoria (en producción usar Redis)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

export async function GET(request: NextRequest) {
  try {
    // Momento fijo de referencia para todo el pronóstico (evita que cambie dentro del map por ms)
    const anchorNow = new Date();
    const { searchParams } = new URL(request.url);
    
    // Validar parámetros requeridos
    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || '');
    const mode = searchParams.get('mode') || 'carpfishing';
    const fishingMode = (mode === 'predator' ? 'predator' : 'carpfishing') as FishingMode;
    const species = normalizeSpecies(searchParams.get('species'));
    const days = parseInt(searchParams.get('days') || '3');

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: 'Parámetros lat y lng son requeridos y deben ser números válidos' },
        { status: 400 }
      );
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: 'Coordenadas fuera de rango válido' },
        { status: 400 }
      );
    }

    if (!['carpfishing', 'predator'].includes(mode)) {
      return NextResponse.json(
        { error: 'Modo debe ser carpfishing o predator' },
        { status: 400 }
      );
    }

    // Generar clave de cache
    const cacheKey = `forecast_${lat.toFixed(4)}_${lng.toFixed(4)}_${mode}_${species}_${days}`;
    
    // Verificar cache
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return NextResponse.json({
          success: true,
          data: cached.data,
          cached: true,
          cacheAge: Math.round((Date.now() - cached.timestamp) / 1000 / 60),
        });
      }
    }

    // Recopilar datos de todas las fuentes en paralelo
    const [weatherResult, astroResult, hydroResult] = await Promise.allSettled([
      OpenMeteoClient.getForecast(lat, lng, days),
      AstroClient.getAstronomicalData(lat, lng, new Date()),
      HydroManager.getHydroData(lat, lng),
    ]);

    // Procesar resultados
    let weatherData = null;
    let astroData = null;
    let hydroData = null;

    if (weatherResult.status === 'fulfilled') {
      weatherData = weatherResult.value;
    } else {
      console.error('Weather API failed:', weatherResult.reason);
      return NextResponse.json(
        { error: 'Error obteniendo datos meteorológicos' },
        { status: 503 }
      );
    }

    if (astroResult.status === 'fulfilled') {
      astroData = astroResult.value;
    } else {
      console.error('Astro API failed:', astroResult.reason);
      // Usar datos astronómicos por defecto
      astroData = {
        sunrise: new Date().toISOString(),
        sunset: new Date().toISOString(),
        moonPhase: 0.5,
        moonIllumination: 50,
      };
    }

    if (hydroResult.status === 'fulfilled') {
      hydroData = hydroResult.value;
    } else {
      console.error('Hydro API failed:', hydroResult.reason);
      hydroData = undefined;
    }

    const estimatedWaterTemps = ActivityScoring.estimateWaterTempSeries(
      weatherData,
      hydroData?.waterTemp
    );

    // Calcular scores de actividad para cada hora
    const forecasts: ForecastData[] = weatherData.map((weather, index) => {
      const derived = computeDerivedFeatures(weatherData, index);

      const pointTime = new Date(weather.time);
      const horizonHoursRaw = (pointTime.getTime() - anchorNow.getTime()) / (60 * 60 * 1000);
      const horizonAbsHours = Math.abs(horizonHoursRaw);
      // Regla de oro (NOW robusto / futuro biológico):
      // - Dentro de ±2h: usar agua real si existe; si no, no pasar waterTemp para que el motor use temp del aire.
      // - Más allá de 2h: usar siempre serie estimada de agua (inercia térmica).
      const waterTempForScoring = horizonAbsHours <= 2
        ? (Number.isFinite(hydroData?.waterTemp) ? hydroData!.waterTemp : undefined)
        : estimatedWaterTemps[index];

      const activityScore = ActivityScoring.calculate({
        weather,
        astro: astroData!,
        hydro: hydroData || undefined,
        marine: undefined, // marine data (TODO: implementar si es costa)
        mode: fishingMode,
        species,
        context: {
          lat,
          now: pointTime,
          anchorNow,
          derived,
          waterTemp: waterTempForScoring,
        },
      });

      return {
        time: weather.time,
        weather,
        astronomy: astroData!,
        hydro: hydroData || undefined,
        activity: activityScore,
        location: {
          latitude: lat,
          longitude: lng,
          name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        },
      };
    });

    const bestWindows = ActivityScoring.findBestWindows(
      forecasts.map(f => ({ time: f.time, score: f.activity.overall })),
      3,
      3
    );

    const response = {
      location: {
        latitude: lat,
        longitude: lng,
        name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      },
      mode,
      species,
      forecasts,
      bestWindows,
      dataAvailability: {
        weather: true,
        astro: true,
        hydro: !!hydroData,
        marine: false,
      },
      generatedAt: new Date().toISOString(),
    };

    // Guardar en cache
    cache.set(cacheKey, {
      data: response,
      timestamp: Date.now(),
    });

    // Limpiar cache antiguo (simple cleanup)
    if (Math.random() < 0.01) { // 1% de probabilidad
      for (const [key, value] of cache.entries()) {
        if (Date.now() - value.timestamp > CACHE_TTL * 2) {
          cache.delete(key);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: response,
      cached: false,
    });

  } catch (error) {
    console.error('Forecast API error:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor', 
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined 
      },
      { status: 500 }
    );
  }
}

// Endpoint para obtener información sobre disponibilidad de datos
export async function OPTIONS(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '');
  const lng = parseFloat(searchParams.get('lng') || '');

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: 'Parámetros lat y lng requeridos' },
      { status: 400 }
    );
  }

  const supportedRegions = HydroManager.getSupportedRegions();
  
  return NextResponse.json({
    location: { latitude: lat, longitude: lng },
    dataAvailability: {
      weather: true, // Open-Meteo es global
      astro: true, // USNO/sunrise-sunset son globales
      marine: true, // Open-Meteo Marine es global
      hydro: HydroManager.supports(lat, lng),
    },
    providers: {
      weather: 'Open-Meteo',
      astro: 'USNO/Sunrise-Sunset',
      marine: 'Open-Meteo Marine',
      hydro: supportedRegions,
    },
  });
}

/* Ejemplo de uso:
GET /api/forecast?lat=40.7128&lng=-74.0060&mode=carpfishing&species=carp&days=3

Respuesta:
{
  "success": true,
  "data": {
    "location": {...},
    "mode": "carpfishing", 
    "forecasts": [...],
    "bestWindows": [...],
    "dataAvailability": {...}
  },
  "cached": false
}
*/
