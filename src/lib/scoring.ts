// Sistema de puntuación de actividad de pesca (0-100) con explicaciones simplificado
import type { 
  WeatherData, 
  AstroData, 
  HydroData, 
  ActivityScore, 
  FishingMode,
  MarineData,
  FishSpecies,
  DerivedWeatherFeatures,
  ScoreBreakdown
} from '@/types';

type ScoringContext = {
  now: Date;
  lat: number;
  derived?: DerivedWeatherFeatures;
  waterTemp?: number;
};

type CalculateArgs = {
  weather: WeatherData;
  astro: AstroData;
  hydro?: HydroData | null;
  marine?: MarineData | null;
  mode?: FishingMode;
  species?: FishSpecies;
  context?: ScoringContext;
};

export class ActivityScoring {
  static calculate(args: CalculateArgs): ActivityScore {
    const {
      weather,
      astro,
      hydro,
      marine,
      mode = 'carpfishing',
      species = 'general',
      context,
    } = args;

    const reasons: string[] = [];
    const normalizedSpecies = this.normalizeSpeciesForMode(species, mode);

    const now = context?.now ?? new Date(weather.time);
    const lat = context?.lat ?? 0;
    const derived = context?.derived;

    // 1) Subscores
    const meteo = this.calculateMeteoScoreSpecies(weather, derived, normalizedSpecies, reasons);
    const astroScore = this.calculateAstroScoreSpecies(astro, now, normalizedSpecies, reasons);
    const hydroScore = hydro ? this.calculateHydroScore(hydro, reasons) : undefined;
    const marineScore = marine ? this.calculateMarineScore(marine, reasons) : undefined;

    // 2) Combine with renormalized weights (40/30/20/10)
    const baseWeights = {
      meteo: 0.4,
      astro: 0.3,
      hydro: hydroScore !== undefined ? 0.2 : 0,
      marine: marineScore !== undefined ? 0.1 : 0,
    };

    const weightSum = baseWeights.meteo + baseWeights.astro + baseWeights.hydro + baseWeights.marine;
    const weightsUsed = {
      meteo: weightSum > 0 ? baseWeights.meteo / weightSum : 0,
      astro: weightSum > 0 ? baseWeights.astro / weightSum : 0,
      hydro: weightSum > 0 ? baseWeights.hydro / weightSum : 0,
      marine: weightSum > 0 ? baseWeights.marine / weightSum : 0,
    };

    let combined = 0;
    combined += weightsUsed.meteo * meteo;
    combined += weightsUsed.astro * astroScore;
    if (hydroScore !== undefined) combined += weightsUsed.hydro * hydroScore;
    if (marineScore !== undefined) combined += weightsUsed.marine * marineScore;

    // 3) Biological multipliers (season/spawn/night)
    const waterTemp = context?.waterTemp;
    const tempProxy = Number.isFinite(waterTemp) ? (waterTemp as number) : weather.temperature;
    const seasonFactor = this.seasonFactor(now, lat, normalizedSpecies);
    const spawnPenalty = this.spawnPenalty(now, lat, tempProxy, normalizedSpecies);
    const nightFactor = this.nightFactor(now, astro, normalizedSpecies);

    let totalScore = combined * seasonFactor * spawnPenalty * nightFactor;
    totalScore = this.clamp(totalScore, 0, 100);

    const confidence = this.calculateConfidenceV2({
      hydro,
      marine,
      derived,
      hasWaterTemp: Number.isFinite(waterTemp),
    });

    const breakdown: ScoreBreakdown = {
      subscores: {
        meteo: Math.round(meteo),
        astro: Math.round(astroScore),
        hydro: hydroScore !== undefined ? Math.round(hydroScore) : undefined,
        marine: marineScore !== undefined ? Math.round(marineScore) : undefined,
      },
      meteoModel: this.getLastMeteoModelInfo(normalizedSpecies),
      weightsUsed,
      bioMultipliers: {
        seasonFactor,
        spawnPenalty,
        nightFactor,
      },
    };

    // Asegurar razones compactas
    const uniqueReasons = Array.from(new Set(reasons)).slice(0, 8);

    return {
      overall: Math.round(totalScore),
      factors: {
        weather: Math.round(meteo),
        astronomy: Math.round(astroScore),
        pressure: weather.pressure,
        wind: weather.windSpeed,
        moon: astro.moonIllumination ?? 50,
        hydro: hydroScore ? Math.round(hydroScore) : 0,
      },
      reasons: uniqueReasons,
      bestWindows: [],
      recommendation: this.getRecommendation(totalScore),
      confidence,
      breakdown,
    };
  }

  // ---- Species model (W/C) ----

  private static _lastMeteoModel: Record<string, { wNorm?: number; cNorm?: number; mix?: { w: number; c: number } }> = {};

  private static getLastMeteoModelInfo(species: FishSpecies) {
    return this._lastMeteoModel[species];
  }

  private static normalizeSpeciesForMode(species: FishSpecies, mode: FishingMode): FishSpecies {
    if (species === 'general') return 'general';
    // Si viene una especie "incompatible" con el modo, no bloqueamos: degradamos a general
    if (mode === 'carpfishing' && (species === 'bass' || species === 'pike' || species === 'catfish')) return 'general';
    if (mode === 'predator' && (species === 'carp' || species === 'barbel')) return 'general';
    return species;
  }

  private static calculateMeteoScoreSpecies(
    weather: WeatherData,
    derived: DerivedWeatherFeatures | undefined,
    species: FishSpecies,
    reasons: string[]
  ): number {
    if (species === 'general') {
      // Fallback a legacy si no hay especie concreta
      return this.calculateWeatherScore(weather, reasons);
    }

    const cfg = this.getSpeciesConfig(species);

    const wFeatures: Record<string, number | undefined> = {
      temp: weather.temperature,
      pressure: weather.pressure,
      wind: weather.windSpeed,
      precip: weather.precipitation,
      cloud: weather.cloudCover,
      humidity: weather.humidity,
    };

    const cFeatures: Record<string, number | undefined> = {
      dPressure1h: derived?.deltaPressure1h,
      dPressure3hAvg: derived?.deltaPressure3hAvg,
      dTemp1h: derived?.deltaTemp1h,
      rainPrev6h: derived?.rainPrev6h,
      rainSum24h: derived?.rainSum24h,
      windStability3h: derived?.windStability3h,
    };

    const wNorm = this.weightedNorm01(cfg.W, wFeatures, cfg.f);
    const cNorm = this.weightedNorm01(cfg.C, cFeatures, cfg.f);

    const meteoNorm = this.clamp01(cfg.meteoMix.w * wNorm + cfg.meteoMix.c * cNorm);
    const meteoScore = meteoNorm * 100;

    this._lastMeteoModel[species] = { wNorm, cNorm, mix: cfg.meteoMix };

    // Razones (top-level)
    reasons.push(`Especie: ${this.speciesLabel(species)}`);
    if (wNorm >= 0.65) reasons.push('Estado actual (W) favorable');
    if (cNorm >= 0.65) reasons.push('Cambios/Acumulados (C) favorables');

    return meteoScore;
  }

  private static calculateAstroScoreSpecies(astro: AstroData, now: Date, species: FishSpecies, reasons: string[]): number {
    // Legacy base: 50 + 30 si está dentro de ±1h de amanecer/atardecer
    const sunrise = new Date(astro.sunrise);
    const sunset = new Date(astro.sunset);

    const isGoldenHour = (
      (now.getTime() >= sunrise.getTime() - 60 * 60 * 1000 && now.getTime() <= sunrise.getTime() + 60 * 60 * 1000) ||
      (now.getTime() >= sunset.getTime() - 60 * 60 * 1000 && now.getTime() <= sunset.getTime() + 60 * 60 * 1000)
    );

    let base = 50 + (isGoldenHour ? 30 : 0);
    if (isGoldenHour) reasons.push('Ventana crepuscular (amanecer/atardecer)');

    // Multiplicador por especie (simple, conservador)
    const mult = (() => {
      switch (species) {
        case 'bass': return 1.2;
        case 'carp': return 0.9;
        case 'barbel': return 0.85;
        case 'pike': return 0.8;
        case 'catfish': return 0.7;
        default: return 1.0;
      }
    })();

    base = this.clamp(base * mult, 0, 100);
    return base;
  }

  // ---- Bio multipliers ----

  private static seasonFactor(date: Date, lat: number, species: FishSpecies): number {
    if (species === 'general') return 1;
    const month = date.getMonth() + 1; // 1..12
    const northern = lat >= 0;
    const m = northern ? month : ((month + 6 - 1) % 12) + 1;

    const isWinter = m === 12 || m === 1 || m === 2;
    const isSpring = m >= 3 && m <= 5;
    const isSummer = m >= 6 && m <= 8;
    const isAutumn = m >= 9 && m <= 11;

    switch (species) {
      case 'carp':
        if (isSummer) return 1.1;
        if (isSpring) return 1.0;
        if (isAutumn) return 0.95;
        return 0.8;
      case 'barbel':
        if (isSummer) return 1.05;
        if (isSpring) return 1.0;
        if (isAutumn) return 0.9;
        return 0.8;
      case 'bass':
        if (isSummer) return 1.1;
        if (isSpring) return 1.0;
        if (isAutumn) return 0.9;
        return 0.75;
      case 'pike':
        if (isAutumn) return 1.1;
        if (isWinter) return 1.0;
        if (isSpring) return 0.95;
        return 0.85;
      case 'catfish':
        if (isSummer) return 1.1;
        if (isSpring) return 0.95;
        if (isAutumn) return 0.9;
        return 0.75;
      default:
        return 1;
    }
  }

  private static spawnPenalty(date: Date, lat: number, waterTemp: number, species: FishSpecies): number {
    if (species === 'general') return 1;
    const month = date.getMonth() + 1;
    const northern = lat >= 0;
    const m = northern ? month : ((month + 6 - 1) % 12) + 1;

    const inRange = (t: number, a: number, b: number) => t >= a && t <= b;

    // Penalización conservadora (no bloqueante) cuando es probable freza
    switch (species) {
      case 'carp': {
        const likelyMonths = m >= 5 && m <= 7;
        return likelyMonths && inRange(waterTemp, 18, 24) ? 0.7 : 1;
      }
      case 'barbel': {
        const likelyMonths = m >= 5 && m <= 7;
        return likelyMonths && inRange(waterTemp, 16, 20) ? 0.75 : 1;
      }
      case 'bass': {
        const likelyMonths = m >= 4 && m <= 6;
        return likelyMonths && inRange(waterTemp, 16, 21) ? 0.75 : 1;
      }
      case 'pike': {
        const likelyMonths = m >= 2 && m <= 4;
        return likelyMonths && inRange(waterTemp, 4, 10) ? 0.8 : 1;
      }
      case 'catfish': {
        const likelyMonths = m >= 5 && m <= 7;
        return likelyMonths && inRange(waterTemp, 20, 26) ? 0.7 : 1;
      }
      default:
        return 1;
    }
  }

  private static nightFactor(date: Date, astro: AstroData, species: FishSpecies): number {
    if (species !== 'catfish') return 1;
    const sunrise = new Date(astro.sunrise);
    const sunset = new Date(astro.sunset);
    const isNight = date.getTime() < sunrise.getTime() || date.getTime() > sunset.getTime();
    return isNight ? 1.1 : 0.7;
  }

  private static calculateConfidenceV2(args: {
    hydro?: HydroData | null;
    marine?: MarineData | null;
    derived?: DerivedWeatherFeatures;
    hasWaterTemp: boolean;
  }): number {
    let confidence = 0.65;
    if (args.hydro) confidence += 0.1;
    if (args.marine) confidence += 0.1;
    if (args.derived && (args.derived.deltaPressure3hAvg !== undefined || args.derived.rainPrev6h !== undefined)) {
      confidence += 0.1;
    }
    if (args.hasWaterTemp) confidence += 0.05;
    return Math.min(1.0, confidence);
  }

  private static calculateWeatherScore(weather: WeatherData, reasons: string[]): number {
    let score = 0;

    // Pressure (0-25 points)
    if (weather.pressure >= 1010 && weather.pressure <= 1030) {
      score += 25;
      reasons.push(`Presión atmosférica favorable (${weather.pressure.toFixed(1)} hPa)`);
    } else {
      score += 10;
      reasons.push(`Presión atmosférica moderada (${weather.pressure.toFixed(1)} hPa)`);
    }

    // Wind (0-20 points)
    if (weather.windSpeed <= 15) {
      score += 20;
      reasons.push(`Viento favorable (${weather.windSpeed.toFixed(1)} km/h)`);
    } else {
      score += 5;
      reasons.push(`Viento fuerte (${weather.windSpeed.toFixed(1)} km/h)`);
    }

    // Precipitation (0-15 points)
    if (weather.precipitation === 0) {
      score += 15;
      reasons.push('Sin precipitación');
    } else if (weather.precipitation < 2) {
      score += 10;
      reasons.push('Precipitación ligera');
    } else {
      score += 2;
      reasons.push('Precipitación intensa');
    }

    // Temperature (0-15 points)
    if (weather.temperature >= 15 && weather.temperature <= 25) {
      score += 15;
      reasons.push(`Temperatura óptima (${weather.temperature.toFixed(1)}°C)`);
    } else {
      score += 8;
      reasons.push(`Temperatura moderada (${weather.temperature.toFixed(1)}°C)`);
    }

    // Cloud cover (0-10 points)
    if (weather.cloudCover <= 50) {
      score += 10;
      reasons.push('Nubosidad favorable');
    } else {
      score += 5;
      reasons.push('Muy nublado');
    }

    return score;
  }

  private static calculateAstroScore(astro: AstroData, reasons: string[]): number {
    let score = 50; // Base score

    // Dawn and dusk bonus
    const now = new Date();
    const sunrise = new Date(astro.sunrise);
    const sunset = new Date(astro.sunset);
    
    const isGoldenHour = (
      (now.getTime() >= sunrise.getTime() - 60 * 60 * 1000 && 
       now.getTime() <= sunrise.getTime() + 60 * 60 * 1000) ||
      (now.getTime() >= sunset.getTime() - 60 * 60 * 1000 && 
       now.getTime() <= sunset.getTime() + 60 * 60 * 1000)
    );

    if (isGoldenHour) {
      score += 30;
      reasons.push('Hora dorada para la pesca');
    } else {
      reasons.push('Hora regular');
    }

    return Math.min(100, score);
  }

  private static calculateHydroScore(hydro: HydroData, reasons: string[]): number {
    let score = 50;

    if (hydro.waterLevel !== undefined) {
      score += 20;
      reasons.push('Datos de nivel de agua disponibles');
    }

    if (hydro.waterFlow !== undefined) {
      score += 20;
      reasons.push('Datos de caudal disponibles');
    }

    if (hydro.waterTemp !== undefined) {
      score += 10;
      reasons.push('Datos de temperatura del agua disponibles');
    }

    return Math.min(100, score);
  }

  private static calculateMarineScore(marine: MarineData, reasons: string[]): number {
    let score = 30;

    if (marine.waveHeight <= 1) {
      score += 20;
      reasons.push('Oleaje favorable');
    } else {
      score += 5;
      reasons.push('Oleaje moderado');
    }

    return Math.min(100, score);
  }

  private static getRecommendation(score: number): string {
    if (score >= 80) return 'Excelente momento para pescar';
    if (score >= 60) return 'Buenas condiciones para pescar';
    if (score >= 40) return 'Condiciones regulares para pescar';
    return 'No es el momento óptimo para pescar';
  }

  private static calculateConfidence(hydro?: HydroData | null, marine?: MarineData | null): number {
    let confidence = 0.7; // Base confidence
    if (hydro) confidence += 0.15;
    if (marine) confidence += 0.15;
    return Math.min(1.0, confidence);
  }

  private static speciesLabel(species: FishSpecies): string {
    switch (species) {
      case 'carp': return 'Carpa';
      case 'barbel': return 'Barbo';
      case 'bass': return 'BlackBass';
      case 'pike': return 'Lucio';
      case 'catfish': return 'Siluro';
      default: return 'General';
    }
  }

  private static getSpeciesConfig(species: Exclude<FishSpecies, 'general'>) {
    // Mezcla W/C recomendada
    const meteoMix = (() => {
      switch (species) {
        case 'carp': return { w: 0.65, c: 0.35 };
        case 'barbel': return { w: 0.55, c: 0.45 };
        case 'bass': return { w: 0.75, c: 0.25 };
        case 'pike': return { w: 0.6, c: 0.4 };
        case 'catfish': return { w: 0.7, c: 0.3 };
      }
    })();

    // Pesos internos W/C (solo sobre features disponibles)
    const W = {
      temp: 3,
      pressure: 3,
      wind: 2,
      precip: 2,
      cloud: 1,
      humidity: 1,
    } as const;

    const C = {
      dPressure1h: 2,
      dPressure3hAvg: 3,
      dTemp1h: 1,
      rainPrev6h: 2,
      rainSum24h: 2,
      windStability3h: 2,
    } as const;

    // Funciones 0..1 (conservadoras; lo específico se mete en thresholds)
    const f = {
      temp: (t: number) => {
        // rangos especie-específicos (muy suaves)
        switch (species) {
          case 'carp': return this.tri(t, 10, 20, 28);
          case 'barbel': return this.tri(t, 8, 16, 24);
          case 'bass': return this.tri(t, 14, 22, 30);
          case 'pike': return this.tri(t, 2, 10, 18);
          case 'catfish': return this.tri(t, 16, 24, 32);
        }
      },
      pressure: (p: number) => {
        // preferencia por estabilidad en 1010-1030; pico 1018
        return this.tri(p, 1005, 1018, 1032);
      },
      wind: (w: number) => this.desc(w, 5, 25),
      precip: (r: number) => this.desc(r, 0.5, 6),
      cloud: (c: number) => this.tri(c, 10, 40, 80),
      humidity: (h: number) => this.tri(h, 35, 65, 95),
      dPressure1h: (dp: number) => this.desc(Math.abs(dp), 0.3, 2.5),
      dPressure3hAvg: (dp: number) => this.desc(Math.abs(dp), 0.2, 1.5),
      dTemp1h: (dt: number) => this.desc(Math.abs(dt), 0.4, 3),
      rainPrev6h: (sum: number) => {
        // Barbo se beneficia más de lluvia previa (proxy de caudal/oxigenación)
        if (species === 'barbel') return this.tri(sum, 0, 3, 15);
        return this.desc(sum, 2, 18);
      },
      rainSum24h: (sum: number) => {
        if (species === 'barbel') return this.tri(sum, 0, 5, 25);
        return this.desc(sum, 4, 30);
      },
      windStability3h: (s: number) => this.clamp01(s),
    } as const;

    return { meteoMix, W, C, f };
  }

  private static weightedNorm01(
    weights: Record<string, number>,
    features: Record<string, number | undefined>,
    fns: Record<string, (x: number) => number>
  ): number {
    let sumW = 0;
    let sum = 0;

    for (const [k, w] of Object.entries(weights)) {
      const raw = features[k];
      if (raw === undefined || raw === null || Number.isNaN(raw)) continue;
      const fn = fns[k];
      if (!fn) continue;
      const v = this.clamp01(fn(raw));
      sumW += w;
      sum += w * v;
    }

    if (sumW <= 0) return 0.5;
    return sum / sumW;
  }

  private static tri(x: number, a: number, b: number, c: number): number {
    // triangular membership a..b..c
    if (x <= a || x >= c) return 0;
    if (x === b) return 1;
    if (x < b) return (x - a) / (b - a);
    return (c - x) / (c - b);
  }

  private static desc(x: number, good: number, bad: number): number {
    // 1 at <=good, 0 at >=bad
    if (x <= good) return 1;
    if (x >= bad) return 0;
    return 1 - (x - good) / (bad - good);
  }

  private static clamp01(x: number): number {
    return this.clamp(x, 0, 1);
  }

  private static clamp(x: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, x));
  }
}