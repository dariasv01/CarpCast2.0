// Componente de mapa interactivo usando Leaflet
'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para los iconos por defecto de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export interface LocationData {
  latitude: number;
  longitude: number;
  name?: string;
}

interface InteractiveMapProps {
  center?: [number, number];
  zoom?: number;
  onLocationSelect?: (location: LocationData) => void;
  selectedLocation?: LocationData | null;
  favorites?: LocationData[];
  height?: string;
  enableLocationSelection?: boolean;
}

export default function InteractiveMap({
  center = [40.4168, -3.7038], // Madrid por defecto
  zoom = 6,
  onLocationSelect,
  selectedLocation,
  favorites = [],
  height = '400px',
  enableLocationSelection = true,
}: InteractiveMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const selectedMarkerRef = useRef<L.Marker | null>(null);
  const favoritesMarkersRef = useRef<L.Marker[]>([]);

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: center,
      zoom: zoom,
      zoomControl: true,
      attributionControl: true,
    });

    // Añadir capa base
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    // Click handler para selección de ubicación
    if (enableLocationSelection && onLocationSelect) {
      map.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        
        try {
          // Reverse geocoding
          const response = await fetch(`/api/places/reverse?lat=${lat}&lng=${lng}`);
          const data = await response.json();
          
          const location: LocationData = {
            latitude: lat,
            longitude: lng,
            name: data.success && data.data.name ? data.data.name : `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          };
          
          onLocationSelect(location);
        } catch (error) {
          // Fallback si falla el geocoding
          onLocationSelect({
            latitude: lat,
            longitude: lng,
            name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          });
        }
      });
    }

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [center, zoom, enableLocationSelection, onLocationSelect]);

  // Actualizar ubicación seleccionada
  useEffect(() => {
    if (!mapRef.current) return;

    // Limpiar marcador anterior
    if (selectedMarkerRef.current) {
      mapRef.current.removeLayer(selectedMarkerRef.current);
      selectedMarkerRef.current = null;
    }

    if (selectedLocation) {
      const marker = L.marker([selectedLocation.latitude, selectedLocation.longitude])
        .addTo(mapRef.current);
      
      marker.bindPopup(selectedLocation.name || 'Ubicación seleccionada').openPopup();

      selectedMarkerRef.current = marker;
      
      // Centrar mapa en la ubicación
      mapRef.current.setView([selectedLocation.latitude, selectedLocation.longitude], 12);
    }
  }, [selectedLocation]);

  // Actualizar marcadores de favoritos
  useEffect(() => {
    if (!mapRef.current) return;

    // Limpiar marcadores anteriores
    favoritesMarkersRef.current.forEach(marker => {
      mapRef.current?.removeLayer(marker);
    });
    favoritesMarkersRef.current = [];

    // Añadir nuevos marcadores de favoritos
    favorites.forEach(favorite => {
      const icon = L.divIcon({
        html: '⭐',
        iconSize: [20, 20],
        className: 'favorite-marker',
      });

      const marker = L.marker([favorite.latitude, favorite.longitude], { icon })
        .addTo(mapRef.current!);
      
      marker.bindPopup(favorite.name || 'Favorito');

      favoritesMarkersRef.current.push(marker);
    });

    // Si hay favoritos, ajustar vista para incluirlos todos
    if (favorites.length > 0 && !selectedLocation) {
      const group = L.featureGroup(favoritesMarkersRef.current);
      mapRef.current.fitBounds(group.getBounds().pad(0.1));
    }
  }, [favorites, selectedLocation]);

  return (
    <div 
      ref={mapContainerRef} 
      style={{ height, width: '100%' }} 
      className="rounded-xl overflow-hidden border border-gray-200"
    />
  );
}