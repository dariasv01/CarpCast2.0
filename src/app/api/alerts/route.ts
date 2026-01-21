// API para gestión de alertas de pesca
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Obtener todas las alertas
export async function GET(request: NextRequest) {
  try {
    const alerts = await db.alert.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    return NextResponse.json(
      { error: 'Error obteniendo alertas' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva alerta
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { type, condition, threshold, enabled = true, spotId } = body;

    // Validaciones
    if (!type || !['activity', 'weather', 'pressure', 'hydro'].includes(type)) {
      return NextResponse.json(
        { error: 'Tipo de alerta debe ser: activity, weather, pressure o hydro' },
        { status: 400 }
      );
    }

    if (!condition || typeof condition !== 'string') {
      return NextResponse.json(
        { error: 'Condición de alerta es requerida' },
        { status: 400 }
      );
    }

    if (typeof threshold !== 'number') {
      return NextResponse.json(
        { error: 'Umbral debe ser un número' },
        { status: 400 }
      );
    }

    // Verificar que el spot existe si se especifica
    if (spotId) {
      const spot = await db.favoriteSpot.findUnique({
        where: { id: spotId },
      });

      if (!spot) {
        return NextResponse.json(
          { error: 'Lugar favorito especificado no existe' },
          { status: 400 }
        );
      }
    }

    // Crear nueva alerta
    const newAlert = await db.alert.create({
      data: {
        type,
        condition,
        threshold,
        enabled: Boolean(enabled),
        spotId: spotId || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: newAlert,
    }, { status: 201 });

  } catch (error) {
    console.error('Create alert error:', error);
    return NextResponse.json(
      { error: 'Error creando alerta' },
      { status: 500 }
    );
  }
}

/* Ejemplo de uso:

POST /api/alerts
{
  "type": "activity",
  "condition": "Actividad alta en amanecer",
  "threshold": 75,
  "enabled": true,
  "spotId": "clxx..."  // opcional
}

Tipos de alertas soportados:
- activity: Índice de actividad supera umbral
- weather: Condiciones meteorológicas específicas
- pressure: Cambios de presión atmosférica  
- hydro: Cambios en nivel/caudal del agua

GET /api/alerts
Respuesta:
{
  "success": true,
  "data": [
    {
      "id": "alert123",
      "type": "activity",
      "condition": "Actividad alta en amanecer",
      "threshold": 75,
      "enabled": true,
      "spotId": "spot123",
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z"
    }
  ]
}
*/