// Endpoint para datos hidrológicos (nivel/caudal)
import { NextRequest, NextResponse } from 'next/server';
import { HydroManager } from '@/lib/api/hydro';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || '');

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

    const hydroData = await HydroManager.getHydroData(lat, lng);
    const supportedRegions = HydroManager.getSupportedRegions();

    if (!hydroData) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No hay datos hidrológicos disponibles para esta ubicación',
        supportedRegions,
        location: { latitude: lat, longitude: lng },
      });
    }

    return NextResponse.json({
      success: true,
      data: hydroData,
      location: { latitude: lat, longitude: lng },
      supportedRegions,
    });

  } catch (error) {
    console.error('Hydro API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Error obteniendo datos hidrológicos',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}

// Endpoint para obtener información sobre regiones soportadas
export async function OPTIONS(request: NextRequest) {
  const supportedRegions = HydroManager.getSupportedRegions();
  
  return NextResponse.json({
    supportedRegions,
    description: 'Sistema modular de datos hidrológicos',
    providers: supportedRegions.map(region => ({
      name: region.provider,
      regions: region.regions,
      description: getProviderDescription(region.provider),
    })),
  });
}

function getProviderDescription(provider: string): string {
  switch (provider) {
    case 'USGS Water Services':
      return 'Datos de caudal y nivel para Estados Unidos en tiempo real';
    case 'European Waterway Data':
      return 'Datos hidrológicos europeos (en desarrollo)';
    default:
      return 'Proveedor de datos hidrológicos';
  }
}

/* Ejemplo de uso:
GET /api/hydro?lat=40.7128&lng=-74.0060

Respuesta exitosa:
{
  "success": true,
  "data": {
    "waterLevel": 2.3,
    "flow": 150.5,
    "trend": "rising",
    "stationName": "Hudson River at NYC",
    "available": true
  },
  "location": {...},
  "supportedRegions": [...]
}

Respuesta cuando no hay datos:
{
  "success": true,
  "data": null,
  "message": "No hay datos hidrológicos disponibles para esta ubicación",
  "supportedRegions": [...],
  "location": {...}
}
*/