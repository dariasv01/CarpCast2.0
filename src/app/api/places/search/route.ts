// Endpoint para búsqueda de lugares usando geocoding
import { NextRequest, NextResponse } from 'next/server';
import { GeocodingClient } from '@/lib/api/geocoding';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '5');

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Parámetro de búsqueda "q" requerido (mínimo 2 caracteres)' },
        { status: 400 }
      );
    }

    if (limit < 1 || limit > 20) {
      return NextResponse.json(
        { error: 'Límite debe estar entre 1 y 20' },
        { status: 400 }
      );
    }

    const locations = await GeocodingClient.searchPlaces(query.trim(), limit);

    return NextResponse.json({
      success: true,
      data: {
        query: query.trim(),
        results: locations,
        count: locations.length,
      },
      attribution: 'Datos de © OpenStreetMap contributors',
    });

  } catch (error) {
    console.error('Places search API error:', error);
    
    // Diferentes tipos de error
    if (String(error).includes('rate limit') || String(error).includes('429')) {
      return NextResponse.json(
        { 
          error: 'Demasiadas búsquedas. Espera un momento e inténtalo de nuevo.',
          code: 'RATE_LIMITED'
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Error en la búsqueda de lugares',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}

/* Ejemplo de uso:
GET /api/places/search?q=Madrid%20Spain&limit=5

Respuesta:
{
  "success": true,
  "data": {
    "query": "Madrid Spain",
    "results": [
      {
        "latitude": 40.4168,
        "longitude": -3.7038,
        "name": "Madrid, Spain",
        "country": "España"
      }
    ],
    "count": 1
  },
  "attribution": "Datos de © OpenStreetMap contributors"
}
*/