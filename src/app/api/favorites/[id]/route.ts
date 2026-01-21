// API para gestión individual de favoritos
import { NextRequest, NextResponse } from 'next/server';
import { db, parseJsonField, stringifyJsonField } from '@/lib/db';

// GET - Obtener favorito específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const favorite = await db.favoriteSpot.findUnique({
      where: { id: params.id },
    });

    if (!favorite) {
      return NextResponse.json(
        { error: 'Lugar favorito no encontrado' },
        { status: 404 }
      );
    }

    const formattedFavorite = {
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
    };

    return NextResponse.json({
      success: true,
      data: formattedFavorite,
    });
  } catch (error) {
    console.error('Get favorite error:', error);
    return NextResponse.json(
      { error: 'Error obteniendo lugar favorito' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar favorito
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    const { name, notes, species, rating, tags, lastVisited } = body;

    // Verificar que el favorito existe
    const existingFavorite = await db.favoriteSpot.findUnique({
      where: { id: params.id },
    });

    if (!existingFavorite) {
      return NextResponse.json(
        { error: 'Lugar favorito no encontrado' },
        { status: 404 }
      );
    }

    // Validaciones
    if (name && (typeof name !== 'string' || name.trim().length === 0)) {
      return NextResponse.json(
        { error: 'Nombre debe ser una cadena válida' },
        { status: 400 }
      );
    }

    if (rating && (typeof rating !== 'number' || rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: 'Rating debe ser un número entre 1 y 5' },
        { status: 400 }
      );
    }

    // Preparar datos para actualizar
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name.trim();
    if (notes !== undefined) updateData.notes = notes || null;
    if (species !== undefined) updateData.species = species ? stringifyJsonField(species) : null;
    if (rating !== undefined) updateData.rating = rating || null;
    if (tags !== undefined) updateData.tags = tags ? stringifyJsonField(tags) : null;
    if (lastVisited !== undefined) {
      updateData.lastVisited = lastVisited ? new Date(lastVisited) : null;
    }

    // Actualizar favorito
    const updatedFavorite = await db.favoriteSpot.update({
      where: { id: params.id },
      data: updateData,
    });

    const formattedFavorite = {
      id: updatedFavorite.id,
      name: updatedFavorite.name,
      location: {
        latitude: updatedFavorite.latitude,
        longitude: updatedFavorite.longitude,
      },
      notes: updatedFavorite.notes,
      species: parseJsonField(updatedFavorite.species),
      lastVisited: updatedFavorite.lastVisited?.toISOString(),
      rating: updatedFavorite.rating,
      tags: parseJsonField(updatedFavorite.tags),
      createdAt: updatedFavorite.createdAt.toISOString(),
      updatedAt: updatedFavorite.updatedAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: formattedFavorite,
    });

  } catch (error) {
    console.error('Update favorite error:', error);
    return NextResponse.json(
      { error: 'Error actualizando lugar favorito' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar favorito
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar que el favorito existe
    const existingFavorite = await db.favoriteSpot.findUnique({
      where: { id: params.id },
    });

    if (!existingFavorite) {
      return NextResponse.json(
        { error: 'Lugar favorito no encontrado' },
        { status: 404 }
      );
    }

    // Eliminar favorito
    await db.favoriteSpot.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Lugar favorito eliminado correctamente',
    });

  } catch (error) {
    console.error('Delete favorite error:', error);
    return NextResponse.json(
      { error: 'Error eliminando lugar favorito' },
      { status: 500 }
    );
  }
}

/* Ejemplo de uso:

PUT /api/favorites/clxx123...
{
  "name": "Río Tajo - Puente de Toledo (Actualizado)",
  "notes": "Zona excelente para carpas grandes. Mejor temprano por la mañana.",
  "rating": 5,
  "lastVisited": "2024-01-20T08:30:00.000Z",
  "tags": ["río", "carpa", "urbano", "actualizado"]
}

DELETE /api/favorites/clxx123...
Respuesta:
{
  "success": true,
  "message": "Lugar favorito eliminado correctamente"
}
*/