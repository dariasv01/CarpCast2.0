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
  // Momento de referencia (cuando se generó el pronóstico) para calcular horizonte a futuro.
  anchorNow?: Date;
  lat: number;
  derived?: DerivedWeatherFeatures;
  waterTemp?: number;
};

type MeteoContext = {
  now: Date;
  anchorNow?: Date;
  astro: AstroData;
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
    const meteo = this.calculateMeteoScoreSpecies(
      weather,
      derived,
      { now, anchorNow: context?.anchorNow, astro, waterTemp: context?.waterTemp },
      normalizedSpecies,
      reasons
    );
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
    const moonFactor = this.moonFactor(astro.moonPhase);

    let totalScore = combined * seasonFactor * spawnPenalty * nightFactor * moonFactor;
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
        moonFactor,
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
    ctx: MeteoContext,
    species: FishSpecies,
    reasons: string[]
  ): number {
    if (species === 'general') {
      // Fallback a legacy si no hay especie concreta
      return this.calculateWeatherScore(weather, reasons);
    }

    const cfg = this.getSpeciesConfig(species);

    const t = Number.isFinite(ctx.waterTemp) ? (ctx.waterTemp as number) : weather.temperature;
    const dewPoint = Number.isFinite(weather.dewPoint)
      ? (weather.dewPoint as number)
      : this.estimateDewPointC(weather.temperature, weather.humidity);

    const tdSpread = (Number.isFinite(t) && Number.isFinite(dewPoint)) ? (t - (dewPoint as number)) : undefined;

    const gustRatio = (Number.isFinite(weather.gustSpeed) && Number.isFinite(weather.windSpeed))
      ? (weather.gustSpeed / Math.max(5, weather.windSpeed))
      : undefined;

    const cloudLayersNorm = this.cloudLayersNorm(weather.cloudCoverLow, weather.cloudCoverMid, weather.cloudCoverHigh);
    const dawnNorm = this.sunWindowNorm(ctx.now, ctx.astro, 90);
    const radiationNorm = this.radiationNorm(weather.shortwaveRadiation, weather.uvIndex, weather.isDay);

    const dPressure3h = derived?.deltaPressure3hAvg !== undefined
      ? derived.deltaPressure3hAvg * 3
      : derived?.deltaPressure1h;

    const wFeatures: Record<string, number | undefined> = {
      wind: weather.windSpeed,
      gustRatio,
      cloud: weather.cloudCover,
      layers: cloudLayersNorm,
      precip: weather.precipitation,
      pop: weather.precipitationProbability,
      pressure: weather.pressure,
      ptrend3h: dPressure3h,
      temp: t,
      rh: weather.humidity,
      tdSpread,
      radiation: radiationNorm,
      dawn: dawnNorm,
    };

    const cFeatures: Record<string, number | undefined> = {
      dP: derived?.deltaPressure1h,
      dPmean: derived?.deltaPressure3hAvg,
      dT: derived?.deltaTemp1h,
      rain: derived?.rainPrev6h,
      rainDays: derived?.rainSum24h,
      wstab: derived?.windStability3h,
    };

    const wNorm = this.weightedNorm01(cfg.W, wFeatures, cfg.f);
    const cNorm = this.weightedNorm01(cfg.C, cFeatures, cfg.f);

    const horizonHours = this.horizonHoursAhead(ctx);
    const mixUsed = this.meteoMixForHorizon(species, cfg.meteoMix, horizonHours);

    const meteoNorm = this.clamp01(mixUsed.w * wNorm + mixUsed.c * cNorm);
    const meteoScore = meteoNorm * 100;

    this._lastMeteoModel[species] = { wNorm, cNorm, mix: mixUsed };

    // Razones (top-level)
    reasons.push(`Especie: ${this.speciesLabel(species)}`);
    if (wNorm >= 0.65) reasons.push('Estado actual (W) favorable');
    if (cNorm >= 0.65) reasons.push('Cambios/Acumulados (C) favorables');
    if (horizonHours > 6 && mixUsed.c > cfg.meteoMix.c) reasons.push('Pronóstico a futuro: más peso a acumulados (C)');

    return meteoScore;
  }

  private static horizonHoursAhead(ctx: MeteoContext): number {
    if (!ctx.anchorNow) return 0;
    const diffMs = ctx.now.getTime() - ctx.anchorNow.getTime();
    if (!Number.isFinite(diffMs)) return 0;
    // Solo futuro
    return Math.max(0, diffMs / (60 * 60 * 1000));
  }

  private static meteoMixForHorizon(
    species: FishSpecies,
    base: { w: number; c: number },
    horizonHours: number
  ): { w: number; c: number } {
    // Tramos EXACTOS solicitados (W/C) por especie según horizonte.
    // Convención de límites: 0–6h incluye 6; 6–24h incluye 24; 24–72h incluye 72.
    // (es decir: <=6, <=24, <=72, >72)
    if (species === 'general') return base;

    const h = horizonHours;

    switch (species) {
      case 'carp':
        if (h <= 6) return { w: 0.65, c: 0.35 };
        if (h <= 24) return { w: 0.63, c: 0.37 };
        if (h <= 72) return { w: 0.55, c: 0.45 };
        return { w: 0.50, c: 0.50 };
      case 'barbel':
        if (h <= 6) return { w: 0.55, c: 0.45 };
        if (h <= 24) return { w: 0.53, c: 0.47 };
        if (h <= 72) return { w: 0.47, c: 0.53 };
        return { w: 0.45, c: 0.55 };
      case 'bass':
        if (h <= 6) return { w: 0.75, c: 0.25 };
        if (h <= 24) return { w: 0.73, c: 0.27 };
        if (h <= 72) return { w: 0.63, c: 0.37 };
        return { w: 0.55, c: 0.45 };
      case 'pike':
        if (h <= 6) return { w: 0.60, c: 0.40 };
        if (h <= 24) return { w: 0.58, c: 0.42 };
        if (h <= 72) return { w: 0.50, c: 0.50 };
        return { w: 0.50, c: 0.50 };
      case 'catfish':
        if (h <= 6) return { w: 0.70, c: 0.30 };
        if (h <= 24) return { w: 0.68, c: 0.32 };
        if (h <= 72) return { w: 0.58, c: 0.42 };
        return { w: 0.55, c: 0.45 };
      default:
        return base;
    }
  }

  // ---- Helpers portados/mezclados (fishingForecastMulti.js) ----

  static estimateWaterTempSeries(weatherHours: WeatherData[], seedTempC?: number): number[] {
    if (!Array.isArray(weatherHours) || weatherHours.length === 0) return [];

    const out: number[] = new Array(weatherHours.length);
    let prev = Number.isFinite(seedTempC)
      ? (seedTempC as number)
      : (Number.isFinite(weatherHours[0]?.temperature) ? weatherHours[0].temperature : 15);

    const k = 0.08; // intercambio térmico con el aire (por hora)
    const solarCoeff = 1.5; // °C por (kW/m2) neto solar
    const windCoeff = 0.05; // enfriamiento por km/h

    for (let i = 0; i < weatherHours.length; i++) {
      const h = weatherHours[i];
      const air = Number.isFinite(h.temperature) ? h.temperature : prev;
      const sw = Number.isFinite(h.shortwaveRadiation) ? (h.shortwaveRadiation as number) : 0; // W/m2
      const wind = Number.isFinite(h.windSpeed) ? h.windSpeed : 0;
      const isDay = typeof h.isDay === 'boolean' ? h.isDay : true;

      const dTAir = k * (air - prev);
      const dTSolar = solarCoeff * (sw / 1000);
      const dTWind = -windCoeff * wind;
      const diurnal = isDay ? 0.08 : -0.04;

      const next = prev + dTAir + dTSolar + dTWind + diurnal;
      const delta = this.clamp(next - prev, -1.5, 1.5);

      prev = this.clamp(prev + delta, 2, 34);
      out[i] = Math.round(prev * 100) / 100;
    }

    return out;
  }

  static findBestWindows(
    items: Array<{ time: string; score: number }>,
    windowHours: number = 3,
    topN: number = 3
  ): ActivityScore['bestWindows'] {
    if (!Array.isArray(items) || items.length === 0) return [];
    const out: Array<{ start: string; end: string; score: number }> = [];

    for (let i = 0; i + windowHours - 1 < items.length; i++) {
      const slice = items.slice(i, i + windowHours);
      const valid = slice.map(s => s.score).filter(v => Number.isFinite(v));
      if (valid.length === 0) continue;
      const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
      out.push({ start: slice[0].time, end: slice[slice.length - 1].time, score: avg });
    }

    out.sort((a, b) => b.score - a.score);
    return out.slice(0, topN).map(w => ({
      start: w.start,
      end: w.end,
      score: Math.round(w.score),
      reason: `Ventana ${windowHours}h`,
    }));
  }

  private static moonFactor(phase: number): number {
    if (!Number.isFinite(phase)) return 1.0;
    const p = ((phase % 1) + 1) % 1;
    const dNew = Math.min(Math.abs(p - 0), Math.abs(p - 1));
    const dFull = Math.abs(p - 0.5);
    if (dNew <= 0.12 || dFull <= 0.12) return 1.06;
    return 1.0;
  }

  private static estimateDewPointC(tempC: number, rhPct: number): number | undefined {
    // Magnus formula (approx). Returns undefined if inputs invalid.
    if (!Number.isFinite(tempC) || !Number.isFinite(rhPct)) return undefined;
    const rh = this.clamp(rhPct, 1, 100) / 100;
    const a = 17.62;
    const b = 243.12;
    const gamma = (a * tempC) / (b + tempC) + Math.log(rh);
    return (b * gamma) / (a - gamma);
  }

  private static sunWindowNorm(now: Date, astro: AstroData, mins: number = 90): number {
    const sunrise = astro.sunrise ? new Date(astro.sunrise) : null;
    const sunset = astro.sunset ? new Date(astro.sunset) : null;
    const ms = mins * 60 * 1000;

    const t = now.getTime();
    if (sunrise && Number.isFinite(sunrise.getTime())) {
      if (Math.abs(t - sunrise.getTime()) <= ms) return 1.0;
    }
    if (sunset && Number.isFinite(sunset.getTime())) {
      if (Math.abs(t - sunset.getTime()) <= ms) return 1.0;
    }
    return 0.0;
  }

  private static radiationNorm(sw: number | undefined, uv: number | undefined, isDay: boolean | undefined): number {
    if (isDay === false) return 0.5;

    if (Number.isFinite(uv)) {
      const u = uv as number;
      if (u <= 2) return 0.9;
      if (u <= 5) return 0.7;
      if (u <= 7) return 0.5;
      return 0.3;
    }

    if (!Number.isFinite(sw)) return 0.6;
    const s = sw as number;
    if (s <= 200) return 0.9;
    if (s <= 500) return 0.7;
    if (s <= 800) return 0.5;
    return 0.35;
  }

  private static cloudLayersNorm(low?: number, mid?: number, high?: number): number {
    const score = (v: number | undefined, peak: number, left0: number, right0: number, fallback: number) => {
      if (!Number.isFinite(v)) return fallback;
      return this.tri(v as number, left0, peak, right0);
    };

    const lowS = score(low, 50, 10, 90, 0.5);
    const midS = score(mid, 50, 10, 90, 0.5);
    const highS = score(high, 40, 5, 95, 0.4);
    return (lowS + midS + highS) / 3;
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

    const W = (() => {
      switch (species) {
        case 'carp':
          return { wind: 11, gustRatio: 4, cloud: 8, layers: 1, precip: 10, pop: 2, pressure: 11, ptrend3h: 10, temp: 9, rh: 5, tdSpread: 4, radiation: 4, dawn: 3 } as const;
        case 'barbel':
          return { wind: 11, gustRatio: 4, cloud: 8, layers: 1, precip: 12, pop: 2, pressure: 11, ptrend3h: 10, temp: 10, rh: 5, tdSpread: 4, radiation: 4, dawn: 2 } as const;
        case 'bass':
          return { wind: 10, gustRatio: 4, cloud: 7, layers: 1, precip: 6, pop: 2, pressure: 9, ptrend3h: 10, temp: 12, rh: 5, tdSpread: 4, radiation: 7, dawn: 6 } as const;
        case 'pike':
          return { wind: 9, gustRatio: 4, cloud: 8, layers: 1, precip: 8, pop: 2, pressure: 13, ptrend3h: 12, temp: 9, rh: 5, tdSpread: 4, radiation: 3, dawn: 4 } as const;
        case 'catfish':
          return { wind: 9, gustRatio: 3, cloud: 8, layers: 1, precip: 9, pop: 2, pressure: 9, ptrend3h: 9, temp: 13, rh: 5, tdSpread: 4, radiation: 4, dawn: 2 } as const;
      }
    })();

    const C = (() => {
      switch (species) {
        case 'carp':
          return { dP: 4, dPmean: 4, dT: 3, rain: 6, rainDays: 4, wstab: 2 } as const;
        case 'barbel':
          return { dP: 4, dPmean: 4, dT: 3, rain: 7, rainDays: 5, wstab: 3 } as const;
        case 'bass':
          return { dP: 4, dPmean: 4, dT: 4, rain: 5, rainDays: 3, wstab: 2 } as const;
        case 'pike':
          return { dP: 5, dPmean: 5, dT: 3, rain: 5, rainDays: 4, wstab: 3 } as const;
        case 'catfish':
          return { dP: 4, dPmean: 4, dT: 3, rain: 6, rainDays: 5, wstab: 2 } as const;
      }
    })();

    const f = {
      // W (inmediatos)
      wind: (w: number) => this.tri(w, 0, 10, 30),
      gustRatio: (ratio: number) => {
        if (!Number.isFinite(ratio)) return 0.5;
        if (ratio <= 1.2) return 1.0;
        if (ratio <= 1.5) return 0.7;
        if (ratio <= 2.0) return 0.4;
        return 0.2;
      },
      cloud: (cc: number) => {
        if (!Number.isFinite(cc)) return 0.5;
        if (cc >= 40 && cc <= 80) return 1.0;
        if (cc >= 20 && cc < 40) return 0.7;
        if (cc > 80 && cc <= 95) return 0.7;
        return 0.3;
      },
      layers: (norm: number) => this.clamp01(norm),
      precip: (mm: number) => {
        if (!Number.isFinite(mm)) return 0.6;
        if (mm === 0) return 0.7;
        if (mm <= 1) return 1.0;
        if (mm <= 3) return 0.6;
        if (mm <= 6) return 0.35;
        return 0.15;
      },
      pop: (pop: number) => {
        if (!Number.isFinite(pop)) return 0.5;
        if (pop <= 20) return 0.7;
        if (pop <= 50) return 0.6;
        if (pop <= 70) return 0.5;
        return 0.35;
      },
      pressure: (p: number) => {
        if (!Number.isFinite(p)) return 0.5;
        if (species === 'carp') {
          if (p <= 995) return 0.6;
          if (p <= 1002) return 0.9;
          if (p <= 1010) return 1.0;
          if (p <= 1016) return 0.6;
          return 0.4;
        }
        return this.tri(p, 995, 1008, 1015);
      },
      ptrend3h: (d: number) => {
        if (!Number.isFinite(d)) return 0.5;
        // d = cambio aproximado en 3h (hPa)
        if (species === 'carp') {
          if (d <= -3.0) return 1.0;
          if (d <= -1.5) return 0.9;
          if (d <= -0.5) return 0.8;
          if (d < 0.5) return 0.65;
          if (d < 1.5) return 0.4;
          return 0.2;
        }
        if (d <= -2.0) return 0.95;
        if (d <= -0.5) return 0.8;
        if (d < 0.5) return 0.6;
        if (d < 2.0) return 0.4;
        return 0.2;
      },
      temp: (t: number) => {
        if (!Number.isFinite(t)) return 0.5;
        switch (species) {
          case 'carp': {
            if (t < 8) return 0.1;
            if (t < 15) return 0.4;
            if (t < 18) return 0.7;
            if (t <= 30) return 1.0;
            if (t <= 32) return 0.7;
            if (t <= 34) return 0.4;
            return 0.2;
          }
          case 'barbel': return this.tri(t, 12, 22, 30);
          case 'bass': return this.tri(t, 12, 22, 30);
          case 'pike': return this.tri(t, 4, 14, 22);
          case 'catfish': return this.tri(t, 14, 24, 32);
        }
      },
      rh: (rh: number) => {
        if (!Number.isFinite(rh)) return 0.5;
        if (rh >= 55 && rh <= 85) return 1.0;
        if ((rh >= 40 && rh < 55) || (rh > 85 && rh <= 95)) return 0.7;
        return 0.4;
      },
      tdSpread: (s: number) => {
        if (!Number.isFinite(s)) return 0.5;
        if (s < 0) return 0.4;
        if (s <= 2) return 0.8;
        if (s <= 8) return 1.0;
        if (s <= 14) return 0.6;
        return 0.3;
      },
      radiation: (norm: number) => this.clamp01(norm),
      dawn: (norm: number) => this.clamp01(norm),

      // C (contexto / cambios)
      dP: (d: number) => {
        if (!Number.isFinite(d)) return 0.5;
        if (d <= -2.0) return 0.95;
        if (d <= -0.5) return 0.8;
        if (d < 0.5) return 0.6;
        if (d < 2.0) return 0.4;
        return 0.25;
      },
      dPmean: (d: number) => {
        if (!Number.isFinite(d)) return 0.5;
        if (d <= -1.5) return 0.95;
        if (d <= -0.5) return 0.8;
        if (d < 0.5) return 0.65;
        if (d < 1.5) return 0.45;
        return 0.25;
      },
      dT: (d: number) => {
        if (!Number.isFinite(d)) return 0.5;
        if (d <= -3.0) return 0.9;
        if (d <= -1.0) return 0.8;
        if (d <= 1.0) return 0.6;
        if (d <= 3.0) return 0.4;
        return 0.3;
      },
      rain: (mm: number) => {
        if (!Number.isFinite(mm)) return 0.5;
        if (mm === 0) return 0.4;
        if (mm <= 2) return 1.0;
        if (mm <= 10) return 0.85;
        if (mm <= 30) return 0.6;
        return 0.3;
      },
      rainDays: (mm: number) => {
        if (!Number.isFinite(mm)) return 0.5;
        if (mm === 0) return 0.5;
        if (mm <= 5) return 1.0;
        if (mm <= 20) return 0.85;
        if (mm <= 50) return 0.6;
        return 0.3;
      },
      wstab: (s: number) => this.clamp01(s),
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