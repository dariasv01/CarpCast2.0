// Página principal de CarpCast 2.0
'use client';

import { useState, useEffect } from 'react';
import { Search, MapPin, Fish, Cloud, Wind, Droplets, Compass, Clock, Zap, Map, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMapLocation, useLocationSearch } from '@/hooks/useMapLocation';
import type { FishSpecies, FishingMode } from '@/types';

// Importar mapa dinámicamente para evitar problemas de SSR
const InteractiveMap = dynamic(() => import('@/components/InteractiveMap'), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-gray-200 rounded-xl flex items-center justify-center">
      <div className="text-gray-500">Cargando mapa...</div>
    </div>
  ),
});

export default function HomePage() {
  const [selectedSpecies, setSelectedSpecies] = useState<FishSpecies>('carp');
  const [selectedMode, setSelectedMode] = useState<FishingMode>('carpfishing');
  const [showMap, setShowMap] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const speciesOptions: Array<{ value: FishSpecies; label: string; mode: FishingMode }> = [
    { value: 'carp', label: 'Carpa', mode: 'carpfishing' },
    { value: 'barbel', label: 'Barbo', mode: 'carpfishing' },
    { value: 'bass', label: 'BlackBass', mode: 'predator' },
    { value: 'pike', label: 'Lucio', mode: 'predator' },
    { value: 'catfish', label: 'Siluro', mode: 'predator' },
  ];

  const {
    selectedLocation,
    handleLocationSelect,
    getCurrentLocation,
    navigateToForecast,
    hasSelection,
  } = useMapLocation();

  const {
    searchQuery,
    searchResults,
    isSearching,
    handleSearchChange,
    clearSearch,
    hasResults,
  } = useLocationSearch();

  // Función para usar ubicación actual
  const useCurrentLocation = async () => {
    try {
      setIsLoading(true);
      const location = await getCurrentLocation();
      handleLocationSelect(location);
      clearSearch();
    } catch (error) {
      console.error('Error obteniendo ubicación:', error);
      alert('No se pudo obtener tu ubicación. Por favor, busca manualmente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para ir al pronóstico
  const goToForecast = () => {
    if (hasSelection) {
      const url = navigateToForecast(selectedMode, selectedSpecies);
      if (url) {
        window.location.href = url;
      }
    } else if (searchQuery.trim()) {
      window.location.href = `/forecast?search=${encodeURIComponent(searchQuery.trim())}&mode=${selectedMode}&species=${selectedSpecies}`;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      goToForecast();
    }
  };

  const selectSearchResult = (result: any) => {
    handleLocationSelect({
      latitude: result.latitude,
      longitude: result.longitude,
      name: result.name,
    });
    clearSearch();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-blue-200 sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <Fish className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              CarpCast 2.0
            </h1>
          </div>
          <p className="text-xs text-center text-gray-600 mt-1">
            Pronóstico Global de Actividad de Pesca
          </p>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
            <Zap className="w-10 h-10 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              Pronóstico de Pesca
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm mt-2">
              Obtén el índice de actividad (0-100) para cualquier lugar del mundo
            </p>
          </div>
        </div>

        {/* Species Selection */}
        <div className="bg-white rounded-2xl p-4 shadow-lg border border-blue-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Especie Objetivo</h3>
          <div className="grid grid-cols-2 gap-3">
            {speciesOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => {
                  setSelectedSpecies(opt.value);
                  setSelectedMode(opt.mode);
                }}
                className={`p-3 rounded-xl border-2 transition-all duration-200 ${
                  selectedSpecies === opt.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Fish className="w-5 h-5" />
                  <div className="text-sm font-medium">{opt.label}</div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {opt.mode === 'carpfishing' ? 'Carpfishing' : 'Depredadores'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Location Selection */}
        <div className="bg-white rounded-2xl p-4 shadow-lg border border-blue-100 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Seleccionar Ubicación</h3>
          
          {/* Selected Location Display */}
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
                <button
                  onClick={() => handleLocationSelect(null as any)}
                  className="p-1 hover:bg-blue-100 rounded-full"
                >
                  <X className="w-4 h-4 text-blue-600" />
                </button>
              </div>
            </div>
          )}
          
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={useCurrentLocation}
              disabled={isLoading}
              className="flex items-center justify-center space-x-2 p-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-xl transition-colors duration-200"
            >
              <MapPin className="w-5 h-5" />
              <span className="text-sm">{isLoading ? 'Obteniendo...' : 'Mi ubicación'}</span>
            </button>
            
            <button
              onClick={() => setShowMap(!showMap)}
              className={`flex items-center justify-center space-x-2 p-3 rounded-xl transition-colors duration-200 ${
                showMap 
                  ? 'bg-green-500 hover:bg-green-600 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <Map className="w-5 h-5" />
              <span className="text-sm">{showMap ? 'Ocultar mapa' : 'Ver mapa'}</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar lugar (ej. Madrid, España)"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none text-sm dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-400 dark:border-slate-700"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {/* Search Results */}
          {hasResults && (
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => selectSearchResult(result)}
                  className="w-full p-3 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-gray-800">
                        {result.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Map */}
          {showMap && (
            <div className="space-y-2">
              <InteractiveMap
                center={selectedLocation ? [selectedLocation.latitude, selectedLocation.longitude] : undefined}
                zoom={selectedLocation ? 12 : 6}
                onLocationSelect={handleLocationSelect}
                selectedLocation={selectedLocation}
                height="300px"
                enableLocationSelection={true}
              />
            </div>
          )}

          {/* Get Forecast Button */}
          <button
            onClick={goToForecast}
            disabled={!hasSelection && !searchQuery.trim()}
            className="w-full p-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-xl transition-all duration-200 font-medium"
          >
            Obtener Pronóstico
          </button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-lg border border-blue-100 text-center">
            <Cloud className="w-8 h-8 mx-auto text-blue-500 mb-2" />
            <h4 className="text-sm font-semibold text-gray-700">Meteorología</h4>
            <p className="text-xs text-gray-500 mt-1">Viento, presión, lluvia</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-lg border border-blue-100 text-center">
            <Clock className="w-8 h-8 mx-auto text-orange-500 mb-2" />
            <h4 className="text-sm font-semibold text-gray-700">Astronomía</h4>
            <p className="text-xs text-gray-500 mt-1">Sol, luna, mareas</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-lg border border-blue-100 text-center">
            <Droplets className="w-8 h-8 mx-auto text-cyan-500 mb-2" />
            <h4 className="text-sm font-semibold text-gray-700">Hidrología</h4>
            <p className="text-xs text-gray-500 mt-1">Nivel, caudal*</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-lg border border-blue-100 text-center">
            <Map className="w-8 h-8 mx-auto text-green-500 mb-2" />
            <h4 className="text-sm font-semibold text-gray-700">Mapa Global</h4>
            <p className="text-xs text-gray-500 mt-1">Selección visual</p>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-4 text-white">
          <h3 className="font-semibold mb-2">🎣 ¿Cómo funciona?</h3>
          <div className="space-y-2 text-sm opacity-90">
            <p>• Analizamos 15+ factores meteorológicos y astronómicos</p>
            <p>• Calculamos un índice de actividad de 0 a 100</p>
            <p>• Identificamos las mejores ventanas del día</p>
            <p>• Explicamos cada factor que afecta la puntuación</p>
          </div>
        </div>

        {/* Quick Access */}
        <div className="bg-white rounded-2xl p-4 shadow-lg border border-blue-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Acceso Rápido</h3>
          <div className="space-y-2">
            <button 
              onClick={() => window.location.href = '/favorites'}
              className="w-full p-3 text-left border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-colors duration-200"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  ⭐
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Lugares Favoritos</div>
                  <div className="text-xs text-gray-500">Guarda tus mejores pesqueros</div>
                </div>
              </div>
            </button>
            <button 
              onClick={() => window.location.href = '/settings'}
              className="w-full p-3 text-left border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-colors duration-200"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  ⚙️
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Configuración</div>
                  <div className="text-xs text-gray-500">Alertas y preferencias</div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}