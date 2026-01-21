// API para gestión de lugares favoritos
import { NextRequest, NextResponse } from 'next/server';
import { db, parseJsonField, stringifyJsonField } from '@/lib/db';

// GET - Obtener todos los favoritos
export async function GET(request: NextRequest) {
  try {
    const favorites = await db.favoriteSpot.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    const formattedFavorites = favorites.map(favorite => ({
      id: favorite.id,
      name: favorite.name,
      location: {
        latitude: favorite.latitude,
        longitude: favorite.longitude,
      },
      notes: favorite.notes,
      species: parseJsonField(favorite.species),
      lastVisited: favorite.lastVisited?.toISOString(),
      rating: favorite.rating,
      tags: parseJsonField(favorite.tags),
      createdAt: favorite.createdAt.toISOString(),
      updatedAt: favorite.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: formattedFavorites,
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    return NextResponse.json(
      { error: 'Error obteniendo lugares favoritos' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo favorito
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { name, latitude, longitude, notes, species, rating, tags } = body;

    // Validaciones
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Nombre es requerido' },
        { status: 400 }
      );
    }

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { error: 'Coordenadas son requeridas y deben ser números' },
        { status: 400 }
      );
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: 'Coordenadas fuera de rango válido' },
        { status: 400 }
      );
    }

    if (rating && (typeof rating !== 'number' || rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: 'Rating debe ser un número entre 1 y 5' },
        { status: 400 }
      );
    }

    // Verificar si ya existe un favorito en esa ubicación exacta
    const existingFavorite = await db.favoriteSpot.findFirst({
      where: {
        AND: [
          { latitude: { equals: latitude } },
          { longitude: { equals: longitude } },
        ],
      },
    });

    if (existingFavorite) {
      return NextResponse.json(
        { error: 'Ya existe un lugar favorito en esas coordenadas' },
        { status: 409 }
      );
    }

    // Crear nuevo favorito
    const newFavorite = await db.favoriteSpot.create({
      data: {
        name: name.trim(),
        latitude,
        longitude,
        notes: notes || null,
        species: species ? stringifyJsonField(species) : null,
        rating: rating || null,
        tags: tags ? stringifyJsonField(tags) : null,
      },
    });

    const formattedFavorite = {
      id: newFavorite.id,
      name: newFavorite.name,
      location: {
        latitude: newFavorite.latitude,
        longitude: newFavorite.longitude,
      },
      notes: newFavorite.notes,
      species: parseJsonField(newFavorite.species),
      lastVisited: newFavorite.lastVisited?.toISOString(),
      rating: newFavorite.rating,
      tags: parseJsonField(newFavorite.tags),
      createdAt: newFavorite.createdAt.toISOString(),
      updatedAt: newFavorite.updatedAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: formattedFavorite,
    }, { status: 201 });

  } catch (error) {
    console.error('Create favorite error:', error);
    return NextResponse.json(
      { error: 'Error creando lugar favorito' },
      { status: 500 }
    );
  }
}

/* Ejemplo de uso:

POST /api/favorites
{
  "name": "Río Tajo - Puente de Toledo",
  "latitude": 40.3985,
  "longitude": -3.7315,
  "notes": "Zona con buenos carpiones. Mejor en amanecer.",
  "species": ["carp", "barbel"],
  "rating": 4,
  "tags": ["río", "carpa", "urbano"]
}

GET /api/favorites
Respuesta:
{
  "success": true,
  "data": [
    {
      "id": "clxx...",
      "name": "Río Tajo - Puente de Toledo",
      "location": {
        "latitude": 40.3985,
        "longitude": -3.7315
      },
      "notes": "Zona con buenos carpiones...",
      "species": ["carp", "barbel"],
      "rating": 4,
      "tags": ["río", "carpa", "urbano"],
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z"
    }
  ]
}
*/