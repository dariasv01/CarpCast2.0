// Sistema de proveedores hidrológicos modulares
import axios from 'axios';
import type { HydroData, HydroProvider } from '@/types';

// Interfaz base para todos los proveedores hidrológicos
export abstract class BaseHydroProvider implements HydroProvider {
  abstract name: string;
  abstract regions: string[];
  abstract dataTypes: string[];
  abstract apiUrl: string;
  abstract rateLimit: number;
  abstract supports(lat: number, lng: number): boolean;
  abstract fetch(lat: number, lng: number): Promise<HydroData | null>;
}

// Proveedor para Estados Unidos usando USGS Water Services
export class USGSHydroProvider extends BaseHydroProvider {
  name = 'USGS Water Services';
  regions = ['US'];
  dataTypes = ['streamflow', 'water_level', 'water_quality'];
  apiUrl = 'https://waterservices.usgs.gov/nwis/iv/';
  rateLimit = 1000; // Requests per hour
  private readonly baseUrl = 'https://waterservices.usgs.gov/nwis/iv/';

  supports(lat: number, lng: number): boolean {
    // Verificar si las coordenadas están aproximadamente dentro de EE.UU.
    // Incluir Alaska, Hawaii y territorios
    const inContinental = lat >= 24.5 && lat <= 49.4 && lng >= -125 && lng <= -66.9;
    const inAlaska = lat >= 54.4 && lat <= 71.6 && lng >= -179.8 && lng <= -129.9;
    const inHawaii = lat >= 18.9 && lat <= 22.2 && lng >= -160.3 && lng <= -154.8;
    
    return inContinental || inAlaska || inHawaii;
  }

  async fetch(lat: number, lng: number): Promise<HydroData | null> {
    try {
      // Buscar estaciones cercanas (en un radio de ~50km)
      const stations = await this.findNearbyStations(lat, lng);
      
      if (stations.length === 0) {
        console.log(`No USGS stations found near ${lat}, ${lng}`);
        return null;
      }

      // Tomar la estación más cercana con datos recientes
      const stationData = await this.fetchStationData(stations[0]);
      
      return stationData;
    } catch (error) {
      console.error('USGS hydro data error:', error);
      return null; // Degradar elegantemente
    }
  }

  private async findNearbyStations(lat: number, lng: number) {
    // Calcular bounding box (aproximadamente 50km en cada dirección)
    const deltaLat = 0.45; // ~50km
    const deltaLng = 0.45 / Math.cos(lat * Math.PI / 180); // Ajustar por latitud

    const bbox = [
      lng - deltaLng,  // west
      lat - deltaLat,  // south
      lng + deltaLng,  // east  
      lat + deltaLat   // north
    ].join(',');

    const params = {
      format: 'json',
      bBox: bbox,
      siteStatus: 'active',
      hasDataTypeCd: 'iv', // Instantaneous values
      parameterCd: '00065,00060', // Stage height, discharge
      siteType: 'ST', // Stream
    };

    const response = await axios.get(`${this.baseUrl}`, {
      params,
      timeout: 10000,
    });

    if (!response.data?.value?.timeSeries) {
      return [];
    }

    // Ordenar por distancia (aproximada) y disponibilidad de datos
    const stations = response.data.value.timeSeries
      .map((ts: any) => ({
        siteCode: ts.sourceInfo.siteCode[0].value,
        siteName: ts.sourceInfo.siteName,
        latitude: parseFloat(ts.sourceInfo.geoLocation.geogLocation.latitude),
        longitude: parseFloat(ts.sourceInfo.geoLocation.geogLocation.longitude),
        parameterCode: ts.variable.variableCode[0].value,
        parameterName: ts.variable.variableDescription,
        unit: ts.variable.unit.unitCode,
      }))
      .filter((station: any) => station.latitude && station.longitude)
      .sort((a: any, b: any) => {
        const distA = this.calculateDistance(lat, lng, a.latitude, a.longitude);
        const distB = this.calculateDistance(lat, lng, b.latitude, b.longitude);
        return distA - distB;
      });

    return stations;
  }

  private async fetchStationData(station: any): Promise<HydroData> {
    const params = {
      format: 'json',
      sites: station.siteCode,
      parameterCd: station.parameterCode,
      period: 'P7D', // Últimos 7 días
    };

    const response = await axios.get(`${this.baseUrl}`, {
      params,
      timeout: 8000,
    });

    const timeSeries = response.data?.value?.timeSeries?.[0];
    if (!timeSeries?.values?.[0]?.value) {
      throw new Error('No recent data available');
    }

    const recentValues = timeSeries.values[0].value
      .slice(-10) // Últimos 10 valores
      .map((v: any) => ({
        value: parseFloat(v.value),
        dateTime: new Date(v.dateTime),
      }))
      .filter((v: any) => !isNaN(v.value))
      .sort((a: any, b: any) => a.dateTime.getTime() - b.dateTime.getTime());

    if (recentValues.length === 0) {
      throw new Error('No valid recent values');
    }

    const currentValue = recentValues[recentValues.length - 1].value;
    const trend = this.calculateTrend(recentValues);

    // Determinar si es nivel o caudal basado en el código del parámetro
    const isDischarge = station.parameterCode === '00060';
    
    return {
      waterLevel: isDischarge ? undefined : currentValue,
      waterFlow: isDischarge ? currentValue : undefined,
      provider: this.name,
      lastUpdate: new Date().toISOString(),
    };
  }

  private calculateTrend(values: Array<{ value: number; dateTime: Date }>): 'rising' | 'falling' | 'stable' {
    if (values.length < 3) return 'stable';

    const recent = values.slice(-3);
    const avgRecent = recent.reduce((sum, v) => sum + v.value, 0) / recent.length;
    
    const older = values.slice(-6, -3);
    if (older.length === 0) return 'stable';
    
    const avgOlder = older.reduce((sum, v) => sum + v.value, 0) / older.length;
    
    const changePercent = ((avgRecent - avgOlder) / avgOlder) * 100;
    
    if (changePercent > 5) return 'rising';
    if (changePercent < -5) return 'falling';
    return 'stable';
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

// Placeholder para futuros proveedores (Europa, Canadá, etc.)
export class EuropeanHydroProvider extends BaseHydroProvider {
  name = 'European Waterway Data';
  regions = ['EU'];
  dataTypes = ['water_level', 'discharge'];
  apiUrl = 'https://api.example.eu/hydro'; // Placeholder
  rateLimit = 500; // Placeholder

  supports(lat: number, lng: number): boolean {
    // Verificar si está en Europa (bounding box aproximado)
    return lat >= 35 && lat <= 71 && lng >= -25 && lng <= 45;
  }

  async fetch(lat: number, lng: number): Promise<HydroData | null> {
    // TODO: Implementar cuando se identifiquen APIs europeas disponibles
    console.log('European hydro data not yet implemented');
    return null;
  }
}

// Proveedor global (fallback) usando Open-Meteo Flood API (GloFAS river discharge)
export class OpenMeteoFloodHydroProvider extends BaseHydroProvider {
  name = 'Open-Meteo Flood API';
  regions = ['Global'];
  dataTypes = ['river_discharge'];
  apiUrl = 'https://flood-api.open-meteo.com/v1/flood';
  rateLimit = 1000; // Open-Meteo es generoso, mantenemos conservador

  supports(_lat: number, _lng: number): boolean {
    // Global coverage (con limitaciones por resolución ~5km)
    return true;
  }

  async fetch(lat: number, lng: number): Promise<HydroData | null> {
    try {
      const params = {
        latitude: lat,
        longitude: lng,
        daily: 'river_discharge',
        forecast_days: 30,
        // Usar selección "land" para preferir celdas de tierra con elevación similar
        cell_selection: 'land',
      };

      const response = await axios.get(this.apiUrl, {
        params,
        timeout: 10000,
      });

      const daily = response.data?.daily;
      const times: string[] | undefined = daily?.time;
      const discharge: number[] | undefined = daily?.river_discharge;

      if (!Array.isArray(times) || !Array.isArray(discharge) || times.length === 0) {
        return null;
      }

      // Tomar el valor para "hoy" si existe; si no, el más cercano a hoy
      const today = new Date();
      const todayKey = today.toISOString().slice(0, 10); // YYYY-MM-DD

      let idx = times.findIndex(t => t === todayKey);
      if (idx === -1) {
        const todayMs = new Date(todayKey).getTime();
        let best = 0;
        let bestDelta = Number.POSITIVE_INFINITY;
        for (let i = 0; i < times.length; i++) {
          const tMs = new Date(times[i]).getTime();
          if (!Number.isFinite(tMs)) continue;
          const delta = Math.abs(tMs - todayMs);
          if (delta < bestDelta) {
            bestDelta = delta;
            best = i;
          }
        }
        idx = best;
      }

      const value = discharge[idx];
      if (typeof value !== 'number' || Number.isNaN(value)) {
        return null;
      }

      return {
        waterFlow: value, // m³/s
        provider: this.name,
        lastUpdate: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Open-Meteo flood hydro data error:', error);
      return null;
    }
  }
}

// Manager principal que coordina todos los proveedores
export class HydroManager {
  private static providers: HydroProvider[] = [
    new USGSHydroProvider(),
    new OpenMeteoFloodHydroProvider(),
    new EuropeanHydroProvider(),
  ];

  static async getHydroData(lat: number, lng: number): Promise<HydroData | null> {
    // Encontrar el primer proveedor que soporte esta ubicación
    const provider = this.providers.find(p => p.supports(lat, lng));
    
    if (!provider) {
      console.log(`No hydro provider available for ${lat}, ${lng}`);
      return null;
    }

    try {
      const data = await provider.fetch(lat, lng);
      return data;
    } catch (error) {
      console.error(`Hydro provider ${provider.name} failed:`, error);
      return null;
    }
  }

  static supports(lat: number, lng: number): boolean {
    return this.providers.some(p => p.supports(lat, lng));
  }

  static getSupportedRegions(): { provider: string; regions: string[] }[] {
    return this.providers.map(p => ({
      provider: p.name,
      regions: p.regions,
    }));
  }

  // Permitir añadir proveedores dinámicamente
  static addProvider(provider: HydroProvider) {
    this.providers.push(provider);
  }
}

// Ejemplo de URL que genera USGSHydroProvider:
/*
Search stations: https://waterservices.usgs.gov/nwis/iv/?format=json&bBox=-74.5,-40.2,-73.5,-41.2&siteStatus=active&hasDataTypeCd=iv&parameterCd=00065,00060&siteType=ST
Fetch data: https://waterservices.usgs.gov/nwis/iv/?format=json&sites=01463500&parameterCd=00060&period=P7D
*/