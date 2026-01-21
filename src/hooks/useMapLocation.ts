// Hook para manejo de ubicaciones en el mapa
'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Location } from '@/types';

export interface LocationData {
  latitude: number;
  longitude: number;
  name?: string;
}

export interface UseMapLocationOptions {
  loadFavorites?: boolean;
}

export function useMapLocation(options: UseMapLocationOptions = {}) {
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);

  const handleLocationSelect = useCallback((location: LocationData | null) => {
    setSelectedLocation(location);
  }, []);

  const getCurrentLocation = useCallback((): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('La geolocalización no es compatible con este navegador'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            
            // Obtener información del lugar usando reverse geocoding
            const response = await fetch(`/api/places/reverse?lat=${latitude}&lng=${longitude}`);
            const data = await response.json();
            
            const location: LocationData = {
              latitude,
              longitude,
              name: data.success && data.data.name ? data.data.name : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            };
            
            resolve(location);
          } catch (error) {
            // Si falla el reverse geocoding, usar coordenadas básicas
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              name: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`,
            });
          }
        },
        (error) => {
          reject(new Error('Error obteniendo ubicación: ' + error.message));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutos
        }
      );
    });
  }, []);

  const navigateToForecast = useCallback((mode: 'carpfishing' | 'predator', species?: string): string | null => {
    if (!selectedLocation) return null;
    
    const params = new URLSearchParams({
      lat: selectedLocation.latitude.toString(),
      lng: selectedLocation.longitude.toString(),
      mode,
    });

    if (species) {
      params.set('species', species);
    }
    
    return `/forecast?${params.toString()}`;
  }, [selectedLocation]);

  const hasSelection = selectedLocation !== null;

  return {
    selectedLocation,
    handleLocationSelect,
    getCurrentLocation,
    navigateToForecast,
    hasSelection,
  };
}

export function useLocationSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationData[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearchChange = useCallback(async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    try {
      const response = await fetch(`/api/places/search?q=${encodeURIComponent(query.trim())}&limit=5`);
      const data = await response.json();
      
      if (data.success) {
        setSearchResults(data.data.results);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error buscando ubicaciones:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
  }, []);

  const hasResults = searchResults.length > 0;

  return {
    searchQuery,
    searchResults,
    isSearching,
    handleSearchChange,
    clearSearch,
    hasResults,
  };
}