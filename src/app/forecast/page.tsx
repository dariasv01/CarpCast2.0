// Página de pronóstico detallado de pesca
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  MapPin, 
  RefreshCw, 
  Star, 
  Clock,
  TrendingUp,
  Droplets,
  Sun,
  Moon,
  Waves,
  AlertCircle,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import ActivityScoreDisplay from '@/components/ActivityScore';
import WeatherDisplay from '@/components/WeatherDisplay';
import type { ForecastData } from '@/types';

export default function ForecastPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center text-gray-600">
          Cargando pronóstico…
        </div>
      }
    >
      <ForecastPageInner />
    </Suspense>
  );
}

function ForecastPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [forecast, setForecast] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHour, setSelectedHour] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['daySummary', 'dayWeather']));

  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiProvider, setAiProvider] = useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [aiReason, setAiReason] = useState<string | null>(null);
  const [aiDebug, setAiDebug] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiCache, setAiCache] = useState<Record<string, { explanation: string; provider?: string }>>({});

  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const search = searchParams.get('search');
  const mode = searchParams.get('mode') || 'carpfishing';
  const species = searchParams.get('species') || 'general';

  const FORECAST_DAYS = 7;

  useEffect(() => {
    loadForecast();
  }, [lat, lng, search, mode, species]);

  const loadForecast = async () => {
    try {
      setLoading(true);
      setError(null);

      let apiUrl = '';
      
      if (lat && lng) {
        apiUrl = `/api/forecast?lat=${lat}&lng=${lng}&mode=${mode}&species=${encodeURIComponent(species)}&days=${FORECAST_DAYS}`;
      } else if (search) {
        // Primero buscar el lugar
        const searchResponse = await fetch(`/api/places/search?q=${encodeURIComponent(search)}&limit=1`);
        const searchData = await searchResponse.json();
        
        if (!searchData.success || searchData.data.results.length === 0) {
          throw new Error('No se encontró la ubicación especificada');
        }
        
        const location = searchData.data.results[0];
        apiUrl = `/api/forecast?lat=${location.latitude}&lng=${location.longitude}&mode=${mode}&species=${encodeURIComponent(species)}&days=${FORECAST_DAYS}`;
      } else {
        throw new Error('No se especificó ubicación');
      }

      const response = await fetch(apiUrl);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error obteniendo pronóstico');
      }

      setForecast(data.data);

      // Seleccionar automáticamente la hora usando corte a :30.
      // Ejemplo: 12:00–12:29 => 12:00, 12:30–13:29 => 13:00
      // (equivalente a redondear al hour más cercano con umbral :30)
      const forecasts = data.data?.forecasts;
      if (Array.isArray(forecasts) && forecasts.length > 0) {
        const shifted = new Date(Date.now() + 30 * 60 * 1000);
        shifted.setMinutes(0, 0, 0);
        const targetMs = shifted.getTime();

        let idx = forecasts.findIndex((f: any) => {
          const t = new Date(f?.time).getTime();
          return Number.isFinite(t) && t === targetMs;
        });

        // Fallback: si no hay match exacto, elegir el más cercano
        if (idx === -1) {
          let bestIdx = 0;
          let bestDelta = Number.POSITIVE_INFINITY;
          for (let i = 0; i < forecasts.length; i++) {
            const t = new Date(forecasts[i]?.time).getTime();
            if (!Number.isFinite(t)) continue;
            const delta = Math.abs(t - targetMs);
            if (delta < bestDelta) {
              bestDelta = delta;
              bestIdx = i;
            }
          }
          idx = bestIdx;
        }

        setSelectedHour(idx);
        const dayKey = typeof forecasts[idx]?.time === 'string' ? forecasts[idx].time.slice(0, 10) : null;
        if (dayKey) setSelectedDay(dayKey);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const toLocalDateKey = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatDayLabel = (dayKey: string) => {
    const todayKey = toLocalDateKey(new Date());
    if (dayKey === todayKey) return 'Hoy';
    const d = new Date(`${dayKey}T00:00:00`);
    return d.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const getNowSlotMs = () => {
    // Misma regla que el auto-seleccionado: corte a :30
    const shifted = new Date(Date.now() + 30 * 60 * 1000);
    shifted.setMinutes(0, 0, 0);
    return shifted.getTime();
  };

  // Importante: este hook debe ejecutarse SIEMPRE (no puede estar después de returns condicionales)
  // para evitar "Rendered more hooks than during the previous render".
  useEffect(() => {
    const list = forecast?.forecasts as ForecastData[] | undefined;
    if (!Array.isArray(list) || list.length === 0) return;

    const todayKey = toLocalDateKey(new Date());

    const fallbackDayKey = (() => {
      const t0 = list?.[0]?.time;
      return typeof t0 === 'string' ? t0.slice(0, 10) : todayKey;
    })();

    const selectedDayKey = selectedDay
      ?? (typeof list?.[selectedHour]?.time === 'string' ? list[selectedHour].time.slice(0, 10) : fallbackDayKey);

    // Solo aplica al día actual
    if (selectedDayKey !== todayKey) return;

    const nowSlot = getNowSlotMs();
    const selectedTime = list?.[selectedHour]?.time;
    const selectedMs = typeof selectedTime === 'string' ? new Date(selectedTime).getTime() : NaN;
    if (!Number.isFinite(selectedMs)) return;

    // Si la hora seleccionada ya es futura, no tocar.
    if (selectedMs >= nowSlot) return;

    // Construir mapa día -> horas
    const byDay = new Map<string, Array<{ index: number; time: string }>>();
    for (let i = 0; i < list.length; i++) {
      const t = list[i]?.time;
      if (typeof t !== 'string') continue;
      const dk = t.slice(0, 10);
      const arr = byDay.get(dk) ?? [];
      arr.push({ index: i, time: t });
      byDay.set(dk, arr);
    }

    const todayList = byDay.get(todayKey) ?? [];
    const next = todayList.find(x => {
      const ms = new Date(x.time).getTime();
      return Number.isFinite(ms) && ms >= nowSlot;
    });

    if (next) {
      setSelectedDay(todayKey);
      setSelectedHour(next.index);
      return;
    }

    // Si no quedan horas hoy, ir al siguiente día
    const dayKeys = Array.from(byDay.keys()).sort();
    const nextDayKey = dayKeys.find(k => k > todayKey);
    if (nextDayKey) {
      const first = byDay.get(nextDayKey)?.[0];
      setSelectedDay(nextDayKey);
      if (first) setSelectedHour(first.index);
    }
  }, [forecast, selectedHour, selectedDay]);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      time: date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
      date: date.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' }),
      isToday: date.toDateString() === new Date().toDateString(),
    };
  };

  const requestAiExplanation = async () => {
    if (!forecast?.forecasts?.[selectedHour]) return;

    const f = forecast.forecasts[selectedHour];
    const cacheKey = `${forecast.location?.latitude}_${forecast.location?.longitude}_${mode}_${species}_${f.time}`;

    if (aiCache[cacheKey]) {
      setAiExplanation(aiCache[cacheKey].explanation);
      setAiProvider(aiCache[cacheKey].provider || null);
      setAiConfigured(null);
      setAiReason(null);
      setAiDebug(null);
      setAiError(null);
      return;
    }

    try {
      setAiLoading(true);
      setAiError(null);

      const payload = {
        mode,
        species,
        location: forecast.location,
        time: f.time,
        activity: f.activity,
        weather: f.weather,
        astronomy: f.astronomy,
        hydro: f.hydro,
      };

      const resp = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await resp.json();

      if (!json?.success) {
        throw new Error(json?.error || 'Error generando explicación');
      }

      const explanation = String(json?.data?.explanation || '');
      const provider = json?.data?.provider ? String(json.data.provider) : undefined;
      const configured = typeof json?.data?.configured === 'boolean' ? Boolean(json.data.configured) : null;
      const reason = json?.data?.reason ? String(json.data.reason) : null;
      const debug = json?.data?.error ? String(json.data.error) : null;

      setAiExplanation(explanation);
      setAiProvider(provider || null);
      setAiConfigured(configured);
      setAiReason(reason);
      setAiDebug(debug);
      setAiCache(prev => ({
        ...prev,
        [cacheKey]: { explanation, provider },
      }));
    } catch (e) {
      setAiError(e instanceof Error ? e.message : String(e));
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" />
          <div className="text-gray-600">Obteniendo pronóstico...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
        <div className="max-w-md bg-white rounded-2xl p-6 shadow-lg text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const currentForecast = forecast.forecasts[selectedHour];
  const groupedForecasts = forecast.forecasts.reduce((groups: Record<string, Array<ForecastData & { index: number }>>, f: ForecastData, index: number) => {
    const dayKey = typeof f.time === 'string' ? f.time.slice(0, 10) : 'unknown';
    if (!groups[dayKey]) groups[dayKey] = [];
    groups[dayKey].push({ ...f, index });
    return groups;
  }, {});

  const dayKeys = Object.keys(groupedForecasts)
    .filter(k => k !== 'unknown')
    .sort();

  const effectiveSelectedDay = selectedDay && groupedForecasts[selectedDay]
    ? selectedDay
    : (dayKeys[0] || null);

  const dayForecastsAll = effectiveSelectedDay ? groupedForecasts[effectiveSelectedDay] : [];

  const todayKey = toLocalDateKey(new Date());
  const isTodaySelected = Boolean(effectiveSelectedDay && effectiveSelectedDay === todayKey);
  const nowSlotMs = getNowSlotMs();

  const visibleHourForecasts = (() => {
    if (!Array.isArray(dayForecastsAll) || dayForecastsAll.length === 0) return [];
    if (!isTodaySelected) return dayForecastsAll;
    return (dayForecastsAll as Array<ForecastData & { index: number }>).filter(f => {
      const t = new Date(f.time).getTime();
      return Number.isFinite(t) && t >= nowSlotMs;
    });
  })();

  const dayBaseForecast = (() => {
    const first = dayForecastsAll?.[0];
    if (first && typeof first.index === 'number') return forecast.forecasts[first.index] as ForecastData;
    return currentForecast as ForecastData;
  })();

  const daySummary = (() => {
    if (!Array.isArray(dayForecastsAll) || dayForecastsAll.length === 0) return null;
    const list = dayForecastsAll as Array<ForecastData & { index: number }>;
    const scores = list
      .map(f => f.activity?.overall)
      .filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
    if (scores.length === 0) return null;

    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    let best = list[0];
    let worst = list[0];
    for (const f of list) {
      if ((f.activity?.overall ?? -1) > (best.activity?.overall ?? -1)) best = f;
      if ((f.activity?.overall ?? 101) < (worst.activity?.overall ?? 101)) worst = f;
    }

    const confidences = list
      .map(f => f.activity?.confidence)
      .filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
    const avgConfidence = confidences.length
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : undefined;

    const recommendation = avg >= 80
      ? 'Excelente día'
      : avg >= 60
        ? 'Buen día'
        : avg >= 40
          ? 'Día regular'
          : 'Día flojo';

    const reasons: string[] = [];
    reasons.push(`Media del día: ${Math.round(avg)}/100`);
    reasons.push(`Mejor hora: ${formatDateTime(best.time).time} (${best.activity.overall}/100)`);
    reasons.push(`Peor hora: ${formatDateTime(worst.time).time} (${worst.activity.overall}/100)`);
    if (avgConfidence !== undefined) reasons.push(`Confianza media: ${Math.round(avgConfidence * 100)}%`);

    return {
      avg,
      best,
      worst,
      avgConfidence,
      recommendation,
      reasons,
    };
  })();

  const dayWeather = (() => {
    if (!Array.isArray(dayForecastsAll) || dayForecastsAll.length === 0) return null;
    const list = dayForecastsAll as Array<ForecastData & { index: number }>;
    const temps = list.map(f => f.weather?.temperature).filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
    const winds = list.map(f => f.weather?.windSpeed).filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
    const gusts = list.map(f => f.weather?.gustSpeed).filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
    const pressures = list.map(f => f.weather?.pressure).filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
    const clouds = list.map(f => f.weather?.cloudCover).filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
    const humidity = list.map(f => f.weather?.humidity).filter((n): n is number => typeof n === 'number' && Number.isFinite(n));

    const precipSum = list.reduce((acc, f) => acc + (Number.isFinite(f.weather?.precipitation) ? (f.weather.precipitation as number) : 0), 0);

    const min = (arr: number[]) => arr.length ? Math.min(...arr) : undefined;
    const max = (arr: number[]) => arr.length ? Math.max(...arr) : undefined;
    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : undefined;

    return {
      tempMin: min(temps),
      tempMax: max(temps),
      windAvg: avg(winds),
      windMax: max(winds),
      gustMax: max(gusts),
      pressureMin: min(pressures),
      pressureMax: max(pressures),
      cloudAvg: avg(clouds),
      humidityAvg: avg(humidity),
      precipSum,
    };
  })();

  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
  const formatSigned = (n: number, decimals = 1) => {
    if (!Number.isFinite(n)) return '—';
    const sign = n > 0 ? '+' : '';
    return `${sign}${n.toFixed(decimals)}`;
  };

  const buildRecentAtmosphereSummary = (hoursBackMax = 3) => {
    const list = forecast?.forecasts as ForecastData[] | undefined;
    if (!Array.isArray(list) || list.length === 0) return null;
    const endIdx = clamp(selectedHour, 0, list.length - 1);
    const startIdx = clamp(endIdx - hoursBackMax, 0, endIdx);
    if (endIdx <= startIdx) return null;

    const window = list.slice(startIdx, endIdx + 1);
    const start = window[0];
    const end = window[window.length - 1];
    const hours = window.length - 1;

    const dTemp = end.weather.temperature - start.weather.temperature;
    const dPressure = end.weather.pressure - start.weather.pressure;
    const dWind = end.weather.windSpeed - start.weather.windSpeed;
    const rainSum = window.slice(0, -1).reduce((acc, f) => acc + (Number.isFinite(f.weather.precipitation) ? f.weather.precipitation : 0), 0);

    const pressures = window.map(f => f.weather.pressure).filter(Number.isFinite);
    const pMin = pressures.length ? Math.min(...pressures) : NaN;
    const pMax = pressures.length ? Math.max(...pressures) : NaN;
    const pSwing = Number.isFinite(pMin) && Number.isFinite(pMax) ? pMax - pMin : NaN;

    const lines: string[] = [];
    lines.push(`En las últimas ${hours}h: Temp ${formatSigned(dTemp, 1)}°C · Presión ${formatSigned(dPressure, 0)} hPa · Viento ${formatSigned(dWind, 0)} km/h · Lluvia ${rainSum.toFixed(1)} mm`);

    // Interpretación corta (conservadora)
    if (Number.isFinite(dPressure)) {
      if (dPressure <= -1) lines.push('Presión en bajada: suele indicar cambio de tiempo; a menudo mejora la actividad antes de un frente.');
      else if (dPressure >= 1) lines.push('Presión en subida: tiempo más estable; si la subida es rápida puede cortar la actividad.');
      else lines.push('Presión bastante estable: condiciones más constantes (menos “cambio” reciente).');
    }

    if (Number.isFinite(pSwing) && pSwing >= 3) lines.push(`Presión variable (oscilación ~${pSwing.toFixed(0)} hPa): el pez puede estar más “caprichoso”.`);

    if (rainSum >= 1) lines.push('Lluvia reciente: puede activar el pez, pero si es intensa puede empeorar la visibilidad y la comodidad.');

    const windNow = end.weather.windSpeed;
    if (Number.isFinite(windNow) && windNow >= 28) lines.push('Viento fuerte: puede penalizar precisión/cebado y enfriar la actividad en aguas muy expuestas.');

    return { startIdx, endIdx, hours, lines };
  };

  const recentAtmosphere = buildRecentAtmosphereSummary(3);

  const dayAvgScoreByKey = (() => {
    const out: Record<string, number> = {};
    for (const key of dayKeys) {
      const list = groupedForecasts[key] as Array<ForecastData & { index: number }> | undefined;
      if (!Array.isArray(list) || list.length === 0) continue;
      const scores = list.map(x => x.activity?.overall).filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
      if (scores.length === 0) continue;
      out[key] = scores.reduce((a, b) => a + b, 0) / scores.length;
    }
    return out;
  })();

  const dayChipClass = (avg: number | undefined, selected: boolean) => {
    const base = selected
      ? 'border-blue-500 bg-blue-50 text-blue-700'
      : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300';
    if (avg === undefined) return base;
    if (selected) return base;
    if (avg >= 80) return `${base} ring-1 ring-green-200`;
    if (avg >= 60) return `${base} ring-1 ring-blue-200`;
    if (avg >= 40) return `${base} ring-1 ring-amber-200`;
    return `${base} ring-1 ring-red-200`;
  };

  const hourlyExplanation = (() => {
    const f = forecast?.forecasts?.[selectedHour] as ForecastData | undefined;
    if (!f?.activity) return null;
    const reasons = Array.isArray(f.activity.reasons) ? f.activity.reasons.slice(0, 5) : [];
    const subs = f.activity.breakdown?.subscores;
    return {
      time: f.time,
      recommendation: f.activity.recommendation,
      overall: f.activity.overall,
      reasons,
      subscores: subs,
    };
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-blue-200 sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-blue-600" />
            </button>
            <div className="flex-1 text-center px-4">
              <div className="flex items-center justify-center space-x-2">
                <MapPin className="w-4 h-4 text-gray-600" />
                <h1 className="text-sm font-semibold text-gray-800 truncate">
                  {forecast.location.name || `${forecast.location.latitude.toFixed(3)}, ${forecast.location.longitude.toFixed(3)}`}
                </h1>
              </div>
              <div className="text-xs text-gray-500 capitalize">{mode}</div>
            </div>
            <button
              onClick={loadForecast}
              className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5 text-blue-600" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Day Summary */}
        <div className="space-y-4">
          <button
            onClick={() => toggleSection('daySummary')}
            className="w-full flex items-center justify-between text-left"
          >
            <h2 className="text-lg font-semibold text-gray-800">Resumen del día</h2>
            {expandedSections.has('daySummary') ? 
              <ChevronDown className="w-5 h-5 text-gray-500" /> : 
              <ChevronRight className="w-5 h-5 text-gray-500" />
            }
          </button>

          {expandedSections.has('daySummary') && daySummary && (
            <div className="bg-white rounded-2xl p-4 shadow-lg border border-blue-100 space-y-3">
              <div className="text-xs text-gray-500">
                {effectiveSelectedDay ? formatDayLabel(effectiveSelectedDay) : 'Día'} · {mode} · {species}
              </div>

              <ActivityScoreDisplay
                score={{
                  overall: Math.round(daySummary.avg),
                  factors: {
                    weather: 0,
                    astronomy: 0,
                    pressure: dayBaseForecast.weather.pressure,
                    wind: dayBaseForecast.weather.windSpeed,
                    moon: dayBaseForecast.astronomy.moonIllumination ?? 50,
                    hydro: dayBaseForecast.hydro ? 50 : 0,
                  },
                  reasons: daySummary.reasons,
                  bestWindows: [],
                  recommendation: daySummary.recommendation,
                  confidence: daySummary.avgConfidence ?? 0.65,
                }}
                timestamp={daySummary.best.time}
              />

              <div className="text-[11px] text-gray-500">
                Este bloque resume el día completo; los detalles por hora están abajo.
              </div>
            </div>
          )}
        </div>

        {/* Day Weather */}
        <div className="space-y-4">
          <button
            onClick={() => toggleSection('dayWeather')}
            className="w-full flex items-center justify-between text-left"
          >
            <h2 className="text-lg font-semibold text-gray-800">Meteorología del día</h2>
            {expandedSections.has('dayWeather') ?
              <ChevronDown className="w-5 h-5 text-gray-500" /> :
              <ChevronRight className="w-5 h-5 text-gray-500" />
            }
          </button>

          {expandedSections.has('dayWeather') && dayWeather && (
            <div className="bg-white rounded-2xl p-4 shadow-lg border border-blue-100">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-orange-50 rounded-xl">
                  <div className="text-xs text-gray-600">Temperatura</div>
                  <div className="font-semibold text-gray-800">
                    {dayWeather.tempMin?.toFixed(1)}°C – {dayWeather.tempMax?.toFixed(1)}°C
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl">
                  <div className="text-xs text-gray-600">Lluvia (total)</div>
                  <div className="font-semibold text-gray-800">{dayWeather.precipSum.toFixed(1)} mm</div>
                </div>
                <div className="p-3 bg-green-50 rounded-xl">
                  <div className="text-xs text-gray-600">Viento</div>
                  <div className="font-semibold text-gray-800">
                    {dayWeather.windAvg?.toFixed(0)} km/h avg · {dayWeather.windMax?.toFixed(0)} km/h máx
                  </div>
                  {dayWeather.gustMax !== undefined && (
                    <div className="text-[11px] text-gray-600">Rachas máx: {dayWeather.gustMax.toFixed(0)} km/h</div>
                  )}
                </div>
                <div className="p-3 bg-purple-50 rounded-xl">
                  <div className="text-xs text-gray-600">Presión</div>
                  <div className="font-semibold text-gray-800">
                    {dayWeather.pressureMin?.toFixed(0)} – {dayWeather.pressureMax?.toFixed(0)} hPa
                  </div>
                  <div className="text-[11px] text-gray-600">
                    Variación: {dayWeather.pressureMin !== undefined && dayWeather.pressureMax !== undefined ? (dayWeather.pressureMax - dayWeather.pressureMin).toFixed(0) : '—'} hPa
                  </div>
                </div>
              </div>

              <div className="mt-3 text-[11px] text-gray-500">
                Nubosidad media: {dayWeather.cloudAvg !== undefined ? `${dayWeather.cloudAvg.toFixed(0)}%` : '—'} · Humedad media: {dayWeather.humidityAvg !== undefined ? `${dayWeather.humidityAvg.toFixed(0)}%` : '—'}
              </div>
            </div>
          )}
        </div>

        {/* Best Windows */}
        {forecast.bestWindows && forecast.bestWindows.length > 0 && (
          <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl p-4 text-white">
            <h3 className="font-semibold mb-3 flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Mejores Ventanas Hoy</span>
            </h3>
            <div className="space-y-2">
              {forecast.bestWindows.map((window: any, index: number) => (
                <div key={index} className="flex items-center justify-between bg-white/20 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">
                      {formatDateTime(window.start).time} - {formatDateTime(window.end).time}
                    </span>
                  </div>
                  <span className="font-semibold">{window.score}/100</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Additional Data */}
        <div className="grid grid-cols-3 gap-4">
          {/* Astronomical */}
          <div className="bg-white rounded-xl p-3 shadow-lg border border-blue-100 text-center">
            <Sun className="w-6 h-6 mx-auto text-yellow-500 mb-2" />
            <div className="text-xs text-gray-600 mb-1">Amanecer</div>
            <div className="text-sm font-semibold">
              {formatDateTime(dayBaseForecast.astronomy.sunrise).time}
            </div>
            <div className="text-xs text-gray-600 mt-2 mb-1">Atardecer</div>
            <div className="text-sm font-semibold">
              {formatDateTime(dayBaseForecast.astronomy.sunset).time}
            </div>
          </div>

          {/* Moon */}
          <div className="bg-white rounded-xl p-3 shadow-lg border border-blue-100 text-center">
            <Moon className="w-6 h-6 mx-auto text-blue-500 mb-2" />
            <div className="text-xs text-gray-600 mb-1">Luna</div>
            <div className="text-sm font-semibold">
              {dayBaseForecast.astronomy.moonIllumination}%
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {dayBaseForecast.astronomy.moonPhase <= 0.1 ? 'Nueva' :
               dayBaseForecast.astronomy.moonPhase >= 0.4 && dayBaseForecast.astronomy.moonPhase <= 0.6 ? 'Llena' :
               'Parcial'}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">Más relevante de noche</div>
          </div>

          {/* Hydro */}
          <div className="bg-white rounded-xl p-3 shadow-lg border border-blue-100 text-center">
            <Droplets className="w-6 h-6 mx-auto text-cyan-500 mb-2" />
            <div className="text-xs text-gray-600 mb-1">Hidrología</div>
            {dayBaseForecast.hydro ? (
              <>
                <div className="text-sm font-semibold text-gray-800">Disponible</div>
                <div className="text-xs text-gray-500 mt-1">
                  {typeof dayBaseForecast.hydro.waterLevel === 'number'
                    ? `Nivel: ${dayBaseForecast.hydro.waterLevel.toFixed(2)}`
                    : typeof dayBaseForecast.hydro.waterFlow === 'number'
                      ? `Caudal: ${dayBaseForecast.hydro.waterFlow.toFixed(2)} m³/s`
                      : 'Datos limitados'}
                </div>
                {/* <div className="text-[10px] text-gray-400 mt-1 truncate">
                  {currentForecast.hydro.provider}
                </div> */}
              </>
            ) : (
              <>
                <div className="text-sm text-gray-400">N/A</div>
                <div className="text-xs text-gray-400">No disponible</div>
              </>
            )}
          </div>
        </div>

        {/* Hourly Forecast */}
        <div className="space-y-4">
          <button
            onClick={() => toggleSection('hourly')}
            className="w-full flex items-center justify-between text-left"
          >
            <h2 className="text-lg font-semibold text-gray-800">Pronóstico por Horas</h2>
            {expandedSections.has('hourly') ? 
              <ChevronDown className="w-5 h-5 text-gray-500" /> : 
              <ChevronRight className="w-5 h-5 text-gray-500" />
            }
          </button>

          {expandedSections.has('hourly') && (
            <div className="space-y-4">
              {/* Day tabs (horizontal) */}
              <div className="-mx-4 px-4 flex items-center gap-2 overflow-x-auto pb-2 snap-x snap-mandatory">
                {dayKeys.map(dayKey => (
                  <button
                    key={dayKey}
                    onClick={() => {
                      setSelectedDay(dayKey);
                      const isToday = dayKey === todayKey;
                      const list = (groupedForecasts[dayKey] || []) as Array<ForecastData & { index: number }>;
                      const preferred = isToday
                        ? list.find(x => new Date(x.time).getTime() >= nowSlotMs)
                        : list[0];
                      if (preferred && typeof preferred.index === 'number') setSelectedHour(preferred.index);
                    }}
                    className={`snap-start shrink-0 px-3 py-2 text-xs rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${dayChipClass(dayAvgScoreByKey[dayKey], effectiveSelectedDay === dayKey)}`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{formatDayLabel(dayKey)}</span>
                      {typeof dayAvgScoreByKey[dayKey] === 'number' && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/70 border border-gray-200">
                          {Math.round(dayAvgScoreByKey[dayKey])}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Hours (horizontal scroll) */}
              <div className="-mx-4 px-4 flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
                {visibleHourForecasts.map((f: ForecastData & { index: number }) => (
                  <button
                    key={f.index}
                    onClick={() => setSelectedHour(f.index)}
                    className={`snap-start shrink-0 w-36 p-3 rounded-xl border-2 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                      selectedHour === f.index
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    <div className="text-sm font-semibold text-gray-800">{formatDateTime(f.time).time}</div>
                    <div className="mt-2">
                      <ActivityScoreDisplay score={f.activity} compact />
                    </div>
                  </button>
                ))}
              </div>

              {isTodaySelected && (
                <div className="text-[11px] text-gray-500">
                  Hoy: se muestran solo horas desde ahora.
                </div>
              )}

              {isTodaySelected && visibleHourForecasts.length === 0 && (
                <div className="text-sm text-gray-600 bg-white rounded-2xl p-4 shadow-lg border border-blue-100">
                  No quedan horas para hoy. Selecciona otro día para ver el pronóstico.
                </div>
              )}

              {/* Per-hour Weather (always visible) */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-800">Meteorología (hora seleccionada)</div>
                    <div className="text-xs text-gray-500">
                      {effectiveSelectedDay ? formatDayLabel(effectiveSelectedDay) : 'Día'} · {formatDateTime(currentForecast.time).time}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <ActivityScoreDisplay score={currentForecast.activity} compact />
                  </div>
                </div>
                <WeatherDisplay weather={currentForecast.weather} />
              </div>

              {/* Explanation for selected hour (collapsible) */}
              <div className="bg-white rounded-2xl shadow-lg border border-blue-100 overflow-hidden">
                <button
                  onClick={() => toggleSection('hourExplanation')}
                  aria-expanded={expandedSections.has('hourExplanation')}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-blue-50/40 transition-colors"
                >
                  <div>
                    <div className="text-sm font-semibold text-gray-800">Explicación (hora seleccionada)</div>
                    <div className="text-xs text-gray-500">Razones + tendencia reciente</div>
                  </div>
                  {expandedSections.has('hourExplanation') ?
                    <ChevronDown className="w-5 h-5 text-gray-500" /> :
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  }
                </button>

                {expandedSections.has('hourExplanation') && hourlyExplanation && (
                  <div className="px-4 pb-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-xs text-gray-500">
                        {formatDateTime(hourlyExplanation.time).date} · {formatDateTime(hourlyExplanation.time).time}
                      </div>
                      <ActivityScoreDisplay score={{ ...currentForecast.activity, overall: hourlyExplanation.overall }} compact />
                    </div>

                    <div className="text-sm text-gray-700">
                      <span className="font-semibold">Recomendación:</span> {hourlyExplanation.recommendation}
                    </div>

                    {hourlyExplanation.subscores && (
                      <div className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="font-semibold text-gray-800 mb-1">Subscores</div>
                        <div>
                          Meteo: {hourlyExplanation.subscores.meteo} · Astro: {hourlyExplanation.subscores.astro}
                          {typeof hourlyExplanation.subscores.hydro === 'number' ? ` · Hydro: ${hourlyExplanation.subscores.hydro}` : ''}
                          {typeof hourlyExplanation.subscores.marine === 'number' ? ` · Marine: ${hourlyExplanation.subscores.marine}` : ''}
                        </div>
                      </div>
                    )}

                    {hourlyExplanation.reasons.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-gray-700">Razones principales</div>
                        <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
                          {hourlyExplanation.reasons.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {recentAtmosphere && (
                      <div className="text-sm text-gray-700 bg-blue-50 border border-blue-100 rounded-lg p-3">
                        <div className="text-xs font-semibold text-blue-800 mb-1">Tendencia reciente (antes de esta hora)</div>
                        <div className="space-y-1">
                          {recentAtmosphere.lines.slice(0, 2).map((t, i) => (
                            <div key={i} className="leading-relaxed">{t}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* AI Explanation for selected hour (collapsible) */}
              <div className="bg-white rounded-2xl shadow-lg border border-blue-100 overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <button
                    onClick={() => toggleSection('aiExplanation')}
                    aria-expanded={expandedSections.has('aiExplanation')}
                    className="flex-1 flex items-center justify-between text-left hover:bg-blue-50/40 transition-colors rounded-lg px-2 py-1 -ml-2"
                  >
                    <div>
                      <div className="text-sm font-semibold text-gray-800">Explicación IA</div>
                      <div className="text-xs text-gray-500">
                        {aiProvider
                          ? `Proveedor: ${aiProvider}${aiConfigured === false ? ' (fallback)' : ''}`
                          : 'Pulsa Generar para ver la explicación'}
                      </div>
                    </div>
                    {expandedSections.has('aiExplanation') ?
                      <ChevronDown className="w-5 h-5 text-gray-500" /> :
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    }
                  </button>

                  <button
                    onClick={requestAiExplanation}
                    disabled={aiLoading}
                    className="shrink-0 px-3 py-2 text-xs bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg transition-colors"
                  >
                    {aiLoading ? 'Generando…' : 'Generar'}
                  </button>
                </div>

                {expandedSections.has('aiExplanation') && (
                  <div className="px-4 pb-4 space-y-3">
                    {aiError && (
                      <div className="text-xs text-red-600">{aiError}</div>
                    )}

                    {aiReason && (
                      <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                        {aiReason}
                      </div>
                    )}

                    {aiDebug && (
                      <div className="text-[11px] text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-2">
                        {aiDebug}
                      </div>
                    )}

                    {aiExplanation !== null ? (
                      <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans">
                        {aiExplanation}
                      </pre>
                    ) : (
                      <div className="text-sm text-gray-600">
                        Pulsa “Generar” para obtener una explicación. Si hay IA configurada, la usará; si no, mostrará una explicación automática.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="text-[11px] text-gray-500">
                Mostrando {dayKeys.length} días (mínimo {FORECAST_DAYS}). Desliza horizontalmente para ver las horas.
              </div>
            </div>
          )}
        </div>

        {/* Data Sources */}
        <div className="bg-white/60 rounded-xl p-4 text-xs text-gray-500 space-y-1">
          <div className="font-semibold text-gray-600 mb-2">Fuentes de Datos:</div>
          <div>• Meteorología: Open-Meteo (Libre)</div>
          <div>• Astronomía: USNO / Sunrise-Sunset (Libre)</div>
          <div>• Geocoding: OpenStreetMap (Libre)</div>
          {forecast.dataAvailability?.hydro && (
            <div>• Hidrología: USGS Water Services</div>
          )}
          <div className="mt-2 text-gray-400">
            Generado: {new Date(forecast.generatedAt).toLocaleString('es')}
          </div>
        </div>
      </main>
    </div>
  );
}