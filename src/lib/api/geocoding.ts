// Cliente para geocoding usando OpenStreetMap Nominatim (Gratuito, con limitaciones)
import axios from 'axios';
import type { NominatimResponse, Location } from '@/types';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'CarpCast/2.0 (Fishing Forecast App)';

// Rate limiting estricto: máximo 1 req/segundo según política de Nominatim
const rateLimiter = {
  lastRequest: 0,
  minInterval: 1000, // 1 second
  queue: [] as Array<() => void>,
  processing: false,
};

async function queueRequest<T>(requestFn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    rateLimiter.queue.push(async () => {
      try {
        const result = await requestFn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
    
    processQueue();
  });
}

async function processQueue() {
  if (rateLimiter.processing || rateLimiter.queue.length === 0) {
    return;
  }
  
  rateLimiter.processing = true;
  
  while (rateLimiter.queue.length > 0) {
    const now = Date.now();
    const timeSinceLastRequest = now - rateLimiter.lastRequest;
    
    if (timeSinceLastRequest < rateLimiter.minInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, rateLimiter.minInterval - timeSinceLastRequest)
      );
    }
    
    const requestFn = rateLimiter.queue.shift();
    if (requestFn) {
      rateLimiter.lastRequest = Date.now();
      await requestFn();
    }
  }
  
  rateLimiter.processing = false;
}

export class GeocodingClient {
  // Cache simple en memoria para evitar requests repetidos
  private static cache = new Map<string, any>();
  private static readonly CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 días

  // Buscar ubicaciones por texto
  static async searchPlaces(query: string, limit: number = 5): Promise<Location[]> {
    const cacheKey = `search:${query}:${limit}`;
    
    // Verificar cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }
    }

    return queueRequest(async () => {
      try {
        const response = await axios.get<NominatimResponse[]>(`${NOMINATIM_BASE}/search`, {
          params: {
            q: query,
            format: 'json',
            addressdetails: 1,
            limit: limit,
            extratags: 1,
          },
          headers: {
            'User-Agent': USER_AGENT,
          },
          timeout: 10000,
        });

        const locations = response.data.map(this.transformNominatimToLocation);
        
        // Cachear resultado
        this.cache.set(cacheKey, {
          data: locations,
          timestamp: Date.now(),
        });

        return locations;
      } catch (error) {
        console.error('Nominatim search error:', error);
        throw new Error('Geocoding search failed. Please try again.');
      }
    });
  }

  // Geocoding inverso: coordenadas -> información del lugar
  static async reverseGeocode(latitude: number, longitude: number): Promise<Location> {
    const cacheKey = `reverse:${latitude.toFixed(4)}:${longitude.toFixed(4)}`;
    
    // Verificar cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }
    }

    return queueRequest(async () => {
      try {
        const response = await axios.get<NominatimResponse>(`${NOMINATIM_BASE}/reverse`, {
          params: {
            lat: latitude,
            lon: longitude,
            format: 'json',
            addressdetails: 1,
            zoom: 10, // Nivel de detalle apropiado para pesca
          },
          headers: {
            'User-Agent': USER_AGENT,
          },
          timeout: 10000,
        });

        const location = this.transformNominatimToLocation(response.data);
        
        // Cachear resultado
        this.cache.set(cacheKey, {
          data: location,
          timestamp: Date.now(),
        });

        return location;
      } catch (error) {
        console.error('Nominatim reverse geocoding error:', error);
        // En caso de error, devolver coordenadas básicas
        return {
          latitude,
          longitude,
          name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        };
      }
    });
  }

  // Transformar respuesta de Nominatim a nuestro tipo Location
  private static transformNominatimToLocation(item: NominatimResponse): Location {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    
    // Extraer información útil de la dirección
    let name = item.display_name;
    let country = item.address?.country;
    
    // Intentar crear un nombre más legible
    if (item.address) {
      const parts = [];
      if (item.address.city) parts.push(item.address.city);
      if (item.address.state) parts.push(item.address.state);
      if (parts.length > 0) {
        name = parts.join(', ');
      }
    }

    return {
      latitude: lat,
      longitude: lon,
      name: name,
      // Nota: timezone se calculará en el backend usando las coordenadas
    };
  }

  // Limpiar cache antiguo
  static clearOldCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }

  // Obtener estadísticas del cache
  static getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

// Ejemplos de URLs que genera esta clase:
/*
Search: https://nominatim.openstreetmap.org/search?q=Madrid%20Spain&format=json&addressdetails=1&limit=5
Reverse: https://nominatim.openstreetmap.org/reverse?lat=40.4168&lon=-3.7038&format=json&addressdetails=1&zoom=10
*/

// IMPORTANTE: Esta clase respeta el rate limiting de Nominatim (1 req/seg).
// Para aplicaciones con mucho tráfico, considerar:
// 1. Self-hosting de Nominatim
// 2. Usar un proxy/cache propio
// 3. Cambiar a un proveedor comercial con más límites