// Página de lugares favoritos
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Star, 
  MapPin, 
  Plus,
  Trash2,
  Edit3,
  Calendar,
  Fish,
  Tag,
  Navigation,
  AlertCircle,
  Map,
  X
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMapLocation } from '@/hooks/useMapLocation';
import type { FavoriteSpot } from '@/types';

// Importar mapa dinámicamente para evitar problemas de SSR
const InteractiveMap = dynamic(() => import('@/components/InteractiveMap'), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-gray-200 rounded-xl flex items-center justify-center">
      <div className="text-gray-500">Cargando mapa...</div>
    </div>
  ),
});

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const {
    selectedLocation,
    handleLocationSelect,
    navigateToForecast,
    hasSelection,
  } = useMapLocation({ loadFavorites: true });

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/favorites');
      const data = await response.json();

      if (data.success) {
        setFavorites(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error cargando favoritos');
    } finally {
      setLoading(false);
    }
  };

  const deleteFavorite = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este lugar favorito?')) {
      return;
    }

    try {
      const response = await fetch(`/api/favorites/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setFavorites(favorites.filter(f => f.id !== id));
      } else {
        const data = await response.json();
        alert(data.error || 'Error eliminando favorito');
      }
    } catch (err) {
      alert('Error eliminando favorito');
    }
  };

  const goToForecast = (favorite: FavoriteSpot) => {
    router.push(
      `/forecast?lat=${favorite.location.latitude}&lng=${favorite.location.longitude}&mode=carpfishing`
    );
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleDateString('es', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const renderStars = (rating: number | undefined) => {
    if (!rating) return null;
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating 
                ? 'text-yellow-500 fill-yellow-500' 
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-gray-600">Cargando favoritos...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-blue-200 sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-blue-600" />
            </button>
            <h1 className="text-lg font-semibold text-gray-800">Lugares Favoritos</h1>
            <button
              onClick={() => setShowAddForm(true)}
              className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5 text-blue-600" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div className="text-red-700">{error}</div>
          </div>
        )}

        {/* Toggle de Mapa */}
        {favorites.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowMap(!showMap)}
              className={`w-full flex items-center justify-center space-x-2 p-3 rounded-xl transition-colors duration-200 ${
                showMap 
                  ? 'bg-green-500 hover:bg-green-600 text-white' 
                  : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
              }`}
            >
              <Map className="w-5 h-5" />
              <span className="text-sm font-medium">
                {showMap ? 'Ocultar mapa' : 'Ver en mapa'}
              </span>
            </button>
          </div>
        )}

        {/* Mapa de Favoritos */}
        {showMap && favorites.length > 0 && (
          <div className="mb-6 bg-white rounded-2xl p-4 shadow-lg border border-blue-100 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Mapa de Favoritos</h3>
            <InteractiveMap
              zoom={6}
              onLocationSelect={handleLocationSelect}
              selectedLocation={selectedLocation}
              favorites={favorites.map(fav => ({
                latitude: fav.location.latitude,
                longitude: fav.location.longitude,
                name: fav.name,
              }))}
              height="300px"
              enableLocationSelection={false}
            />
            
            {hasSelection && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="text-sm font-medium text-blue-800">
                        {selectedLocation!.name}
                      </div>
                      <div className="text-xs text-blue-600">
                        {selectedLocation!.latitude.toFixed(4)}, {selectedLocation!.longitude.toFixed(4)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        const url = navigateToForecast('carpfishing');
                        if (url) window.location.href = url;
                      }}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg transition-colors"
                    >
                      Ver pronóstico
                    </button>
                    <button
                      onClick={() => handleLocationSelect(null as any)}
                      className="p-1 hover:bg-blue-100 rounded-full"
                    >
                      <X className="w-3 h-3 text-blue-600" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {favorites.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
              <Star className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                No tienes favoritos aún
              </h2>
              <p className="text-gray-600 text-sm mb-6">
                Guarda tus lugares de pesca favoritos para acceso rápido
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors"
              >
                Añadir Primer Favorito
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {favorites.map(favorite => (
              <div key={favorite.id} className="bg-white rounded-2xl p-4 shadow-lg border border-blue-100">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">
                      {favorite.name}
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {favorite.location.latitude.toFixed(4)}, {favorite.location.longitude.toFixed(4)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => goToForecast(favorite)}
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Ver pronóstico"
                    >
                      <Navigation className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteFavorite(favorite.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Rating */}
                {favorite.rating && (
                  <div className="mb-3">
                    {renderStars(favorite.rating)}
                  </div>
                )}

                {/* Notes */}
                {favorite.notes && (
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">{favorite.notes}</p>
                  </div>
                )}

                {/* Tags */}
                {favorite.tags && favorite.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {favorite.tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                      >
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Species */}
                {favorite.species && favorite.species.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {favorite.species.map(species => (
                      <span
                        key={species}
                        className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full"
                      >
                        <Fish className="w-3 h-3 mr-1" />
                        {species}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>Última visita: {formatDate(favorite.lastVisit)}</span>
                  </div>
                  <button
                    onClick={() => goToForecast(favorite)}
                    className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-full transition-colors"
                  >
                    Ver Pronóstico
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Favorite Modal Placeholder */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Añadir Favorito
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del lugar
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Río Tajo - Puente de Toledo"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Latitud
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="40.4168"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Longitud
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="-3.7038"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas (opcional)
                  </label>
                  <textarea
                    placeholder="Descripción del lugar, consejos, mejores momentos..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    // TODO: Implementar lógica de guardado
                    alert('Funcionalidad de guardado en desarrollo');
                    setShowAddForm(false);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}