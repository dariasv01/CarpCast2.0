// Endpoint para geocoding inverso (coordenadas -> información del lugar)
import { NextRequest, NextResponse } from 'next/server';
import { GeocodingClient } from '@/lib/api/geocoding';

export const dynamic = 'force-dynamic';

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

    const location = await GeocodingClient.reverseGeocode(lat, lng);

    return NextResponse.json({
      success: true,
      data: location,
      attribution: 'Datos de © OpenStreetMap contributors',
    });

  } catch (error) {
    console.error('Reverse geocoding API error:', error);
    
    if (String(error).includes('rate limit') || String(error).includes('429')) {
      return NextResponse.json(
        { 
          error: 'Demasiadas consultas. Espera un momento e inténtalo de nuevo.',
          code: 'RATE_LIMITED'
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Error en geocoding inverso',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}

/* Ejemplo de uso:
GET /api/places/reverse?lat=40.7128&lng=-74.0060

Respuesta:
{
  "success": true,
  "data": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "name": "Nueva York, NY",
    "country": "Estados Unidos"
  },
  "attribution": "Datos de © OpenStreetMap contributors"
}
*/