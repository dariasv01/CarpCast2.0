import { NextRequest, NextResponse } from 'next/server';

type ExplainRequest = {
  mode?: string;
  species?: string;
  location?: { name?: string; latitude?: number; longitude?: number };
  time?: string;
  activity?: { overall?: number; recommendation?: string; reasons?: string[]; breakdown?: any };
  weather?: any;
  astronomy?: any;
  hydro?: any;
};

type RateEntry = { count: number; resetAt: number };

function getRateLimitStore(): Map<string, RateEntry> {
  const g = globalThis as unknown as { __carpcastExplainRateLimit?: Map<string, RateEntry> };
  if (!g.__carpcastExplainRateLimit) g.__carpcastExplainRateLimit = new Map();
  return g.__carpcastExplainRateLimit;
}

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  // NextRequest no expone IP en todas las runtimes; usamos un bucket genérico
  return 'unknown';
}

function getExplainRateConfig() {
  const perHour = Number(process.env.EXPLAIN_RATE_LIMIT_PER_HOUR ?? 30);
  return {
    perHour: Number.isFinite(perHour) && perHour > 0 ? Math.floor(perHour) : 30,
  };
}

function checkAndConsumeExplainRate(ip: string): { allowed: boolean; resetAt: number; remaining: number } {
  const store = getRateLimitStore();
  const { perHour } = getExplainRateConfig();
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;

  const current = store.get(ip);
  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(ip, { count: 1, resetAt });
    return { allowed: true, resetAt, remaining: perHour - 1 };
  }

  if (current.count >= perHour) {
    return { allowed: false, resetAt: current.resetAt, remaining: 0 };
  }

  current.count += 1;
  store.set(ip, current);
  return { allowed: true, resetAt: current.resetAt, remaining: Math.max(0, perHour - current.count) };
}

function safeStringify(obj: unknown, maxLen = 12000): string {
  let s = '';
  try {
    s = JSON.stringify(obj);
  } catch {
    s = String(obj);
  }
  if (s.length > maxLen) return s.slice(0, maxLen) + '…';
  return s;
}

function fallbackExplanation(body: ExplainRequest): string {
  const score = body.activity?.overall;
  const rec = body.activity?.recommendation;
  const reasons = Array.isArray(body.activity?.reasons) ? body.activity!.reasons!.slice(0, 6) : [];

  const when = body.time ? new Date(body.time) : null;
  const whenLabel = when && Number.isFinite(when.getTime()) ? when.toLocaleString('es', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : null;
  const locLabel = body.location?.name || (typeof body.location?.latitude === 'number' && typeof body.location?.longitude === 'number'
    ? `${body.location.latitude.toFixed(3)}, ${body.location.longitude.toFixed(3)}`
    : null);

  const temp = typeof body.weather?.temperature === 'number' ? body.weather.temperature : null;
  const wind = typeof body.weather?.windSpeed === 'number' ? body.weather.windSpeed : null;
  const precip = typeof body.weather?.precipitation === 'number' ? body.weather.precipitation : null;
  const pressure = typeof body.weather?.pressure === 'number' ? body.weather.pressure : null;

  const moonIll = typeof body.astronomy?.moonIllumination === 'number' ? body.astronomy.moonIllumination : null;
  const sunrise = typeof body.astronomy?.sunrise === 'string' ? body.astronomy.sunrise : null;
  const sunset = typeof body.astronomy?.sunset === 'string' ? body.astronomy.sunset : null;

  const isDaylight = (() => {
    if (!when || !sunrise || !sunset) return null;
    const sr = new Date(sunrise);
    const ss = new Date(sunset);
    if (!Number.isFinite(sr.getTime()) || !Number.isFinite(ss.getTime())) return null;
    const t = when.getTime();
    return t >= sr.getTime() && t <= ss.getTime();
  })();

  const flow = typeof body.hydro?.waterFlow === 'number' ? body.hydro.waterFlow : null;
  const level = typeof body.hydro?.waterLevel === 'number' ? body.hydro.waterLevel : null;
  const hydroProvider = typeof body.hydro?.provider === 'string' ? body.hydro.provider : null;

  const headerPieces: string[] = [];
  headerPieces.push(`Puntuación: ${typeof score === 'number' ? score : 'N/A'}/100${rec ? ` — ${rec}` : ''}`);
  if (locLabel) headerPieces.push(`Lugar: ${locLabel}`);
  if (whenLabel) headerPieces.push(`Hora: ${whenLabel}`);

  const dataBits: string[] = [];
  if (temp !== null) dataBits.push(`Temp: ${temp.toFixed(1)}°C`);
  if (wind !== null) dataBits.push(`Viento: ${wind.toFixed(0)} km/h`);
  if (precip !== null) dataBits.push(`Lluvia: ${precip.toFixed(1)} mm`);
  if (pressure !== null) dataBits.push(`Presión: ${pressure.toFixed(0)} hPa`);
  if (moonIll !== null) dataBits.push(`Luna: ${moonIll.toFixed(0)}%`);
  if (flow !== null) dataBits.push(`Caudal: ${flow.toFixed(2)} m³/s`);
  if (level !== null) dataBits.push(`Nivel: ${level.toFixed(2)}`);

  const lines: string[] = [];
  lines.push(...headerPieces);
  if (dataBits.length > 0) lines.push(`Datos: ${dataBits.join(' · ')}`);
  if (sunrise || sunset) {
    const sr = sunrise ? new Date(sunrise) : null;
    const ss = sunset ? new Date(sunset) : null;
    const srOk = sr && Number.isFinite(sr.getTime()) ? sr.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : null;
    const ssOk = ss && Number.isFinite(ss.getTime()) ? ss.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : null;
    const astroBits = [srOk ? `Amanecer: ${srOk}` : null, ssOk ? `Atardecer: ${ssOk}` : null].filter(Boolean);
    if (astroBits.length > 0) lines.push(`Astronomía: ${astroBits.join(' · ')}`);
  }
  if (hydroProvider) lines.push(`Hidrología: ${hydroProvider}`);

  if (isDaylight === true) {
    lines.push('');
    lines.push('Nota: es de día; la luminosidad lunar suele tener un impacto mínimo en la actividad.');
  }

  if (reasons.length === 0) {
    lines.push('');
    lines.push('Factores:');
    lines.push('- No hay razones detalladas disponibles.');
    return lines.join('\n');
  }

  lines.push('');
  lines.push('Principales factores:');
  lines.push(...reasons.map(r => `- ${r}`));
  return lines.join('\n');
}

async function callOpenAI(messages: Array<{ role: 'system' | 'user'; content: string }>): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY no configurada');
  }

  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`LLM error ${resp.status}: ${text}`);
  }

  const json: any = await resp.json();
  const content: string | undefined = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Respuesta IA vacía');
  return content;
}

function detectProvider() {
  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  // Ollama suele exponer OpenAI-compatible en http://localhost:11434/v1
  if (/^https?:\/\/localhost:11434(\/v1)?$/i.test(baseUrl)) return 'ollama-local';
  if (/^https?:\/\/127\.0\.0\.1:11434(\/v1)?$/i.test(baseUrl)) return 'ollama-local';
  if (/api\.groq\.com\/openai\/v1$/i.test(baseUrl)) return 'groq-online';
  if (/openrouter\.ai\/api\/v1$/i.test(baseUrl)) return 'openrouter-online';
  if (/api\.together\.xyz\/v1$/i.test(baseUrl)) return 'together-online';
  if (/api\.openai\.com\/v1$/i.test(baseUrl)) return 'openai-online';
  return 'openai-compatible';
}

export async function POST(req: NextRequest) {
  let body: ExplainRequest | undefined;
  try {
    body = (await req.json()) as ExplainRequest;

    // Validación mínima para evitar payloads enormes
    if (body && typeof body === 'object') {
      // ok
    } else {
      return NextResponse.json({ success: false, error: 'Body inválido' }, { status: 400 });
    }

    // Fallback si no hay API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        success: true,
        data: {
          explanation: fallbackExplanation(body),
          provider: 'fallback',
          configured: false,
          reason: 'OPENAI_API_KEY no configurada (reinicia el servidor tras cambiar .env.local)',
        },
      });
    }

    // Si hay API key (producción), proteger contra abuso: rate limit por IP
    const ip = getClientIp(req);
    const rate = checkAndConsumeExplainRate(ip);
    if (!rate.allowed) {
      return NextResponse.json({
        success: true,
        data: {
          explanation: fallbackExplanation(body),
          provider: 'fallback',
          configured: true,
          reason:
            'Límite de IA alcanzado para esta IP; usando explicación automática para proteger el servicio.',
        },
      });
    }

    const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');

    const system =
      'Eres un asistente experto en pesca que explica un pronóstico de actividad. ' +
      'Responde en español, claro y breve. ' +
      'Usa SOLO los datos proporcionados; no inventes. ' +
      'Devuelve: 1 párrafo corto + 4-7 viñetas de factores. ' +
      'Si faltan datos, dilo explícitamente.';

    const when = body.time ? new Date(body.time) : null;
    const whenLabel = when && Number.isFinite(when.getTime())
      ? when.toLocaleString('es', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
      : undefined;

    const sunrise = typeof body.astronomy?.sunrise === 'string' ? new Date(body.astronomy.sunrise) : null;
    const sunset = typeof body.astronomy?.sunset === 'string' ? new Date(body.astronomy.sunset) : null;
    const sunriseLabel = sunrise && Number.isFinite(sunrise.getTime()) ? sunrise.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : undefined;
    const sunsetLabel = sunset && Number.isFinite(sunset.getTime()) ? sunset.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : undefined;
    const moonIll = typeof body.astronomy?.moonIllumination === 'number' ? body.astronomy.moonIllumination : undefined;
    const moonPhase = typeof body.astronomy?.moonPhase === 'number' ? body.astronomy.moonPhase : undefined;

    const dayPeriod = (() => {
      if (!when || !sunrise || !sunset) return undefined;
      if (!Number.isFinite(sunrise.getTime()) || !Number.isFinite(sunset.getTime())) return undefined;
      const t = when.getTime();
      return t >= sunrise.getTime() && t <= sunset.getTime() ? 'día' : 'noche';
    })();

    const flow = typeof body.hydro?.waterFlow === 'number' ? body.hydro.waterFlow : undefined;
    const level = typeof body.hydro?.waterLevel === 'number' ? body.hydro.waterLevel : undefined;
    const hydroProvider = typeof body.hydro?.provider === 'string' ? body.hydro.provider : undefined;

    const keyFactsLines: string[] = [];
    if (body.location?.name) keyFactsLines.push(`Lugar: ${body.location.name}`);
    if (whenLabel) keyFactsLines.push(`Hora: ${whenLabel}`);
    if (sunriseLabel || sunsetLabel) keyFactsLines.push(`Sol: amanecer ${sunriseLabel ?? 'N/D'} · atardecer ${sunsetLabel ?? 'N/D'}`);
    if (dayPeriod) keyFactsLines.push(`Periodo: ${dayPeriod} (si es día, la luna tiene impacto bajo)`);
    if (moonIll !== undefined || moonPhase !== undefined) keyFactsLines.push(`Luna: iluminación ${moonIll !== undefined ? `${Math.round(moonIll)}%` : 'N/D'} · fase ${moonPhase !== undefined ? moonPhase.toFixed(2) : 'N/D'}`);
    if (flow !== undefined || level !== undefined) {
      const hydroBits = [
        flow !== undefined ? `caudal ${flow.toFixed(2)} m³/s` : null,
        level !== undefined ? `nivel ${level.toFixed(2)}` : null,
        hydroProvider ? `proveedor ${hydroProvider}` : null,
      ].filter(Boolean);
      keyFactsLines.push(`Hidrología: ${hydroBits.join(' · ')}`);
    } else {
      keyFactsLines.push('Hidrología: no disponible');
    }

    const user =
      'Explica por qué el score es el que es para esta hora. ' +
      'Incluye qué ayudó y qué perjudicó. ' +
      'Regla importante: si el periodo es día (entre amanecer y atardecer), NO sobrevalores la luna; menciónala como factor secundario o ignórala si no aporta.\n\n' +
      'Datos clave (para usar sí o sí):\n' +
      keyFactsLines.map(l => `- ${l}`).join('\n') +
      '\n\n' +
      'Datos completos (JSON):\n' +
      safeStringify(body);

    const explanation = await callOpenAI([
      { role: 'system', content: system },
      { role: 'user', content: user },
    ]);

    return NextResponse.json({
      success: true,
      data: {
        explanation,
        provider: detectProvider(),
        configured: true,
        baseUrl: process.env.NODE_ENV === 'development' ? baseUrl : undefined,
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      },
    });
  } catch (error) {
    // En caso de fallo de IA, devolvemos fallback para no romper UI
    return NextResponse.json({
      success: true,
      data: {
        explanation: fallbackExplanation(body || {}),
        provider: 'fallback',
        configured: Boolean(process.env.OPENAI_API_KEY),
        reason: 'Fallo llamando al proveedor IA; usando fallback local',
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
    });
  }
}
