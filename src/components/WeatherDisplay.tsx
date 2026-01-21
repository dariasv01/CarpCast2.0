// Componente para mostrar datos meteorológicos
'use client';

import { Cloud, Wind, Droplets, Gauge, Thermometer, Eye } from 'lucide-react';
import type { WeatherData } from '@/types';

interface WeatherDisplayProps {
  weather: WeatherData;
  showHourly?: boolean;
}

export default function WeatherDisplay({ weather, showHourly = false }: WeatherDisplayProps) {
  const formatWindDirection = (degrees: number): string => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  const getWindIcon = (speed: number) => {
    if (speed < 10) return '🍃'; // Brisa ligera
    if (speed < 20) return '💨'; // Viento moderado
    if (speed < 30) return '🌪️'; // Viento fuerte
    return '⚠️'; // Viento muy fuerte
  };

  const getRainIcon = (precipitation: number) => {
    if (precipitation === 0) return '☀️';
    if (precipitation < 2) return '🌦️';
    if (precipitation < 5) return '🌧️';
    return '⛈️';
  };

  const getCloudIcon = (cover: number) => {
    if (cover < 20) return '☀️';
    if (cover < 50) return '⛅';
    if (cover < 80) return '☁️';
    return '☁️';
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-lg border border-blue-100">
      {showHourly && (
        <div className="text-sm text-gray-600 mb-3">
          {new Date(weather.time).toLocaleString('es', {
            hour: '2-digit',
            minute: '2-digit',
            day: 'numeric',
            month: 'short',
          })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Temperatura */}
        <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-xl">
          <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
            <Thermometer className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-800">
              {weather.temperature.toFixed(1)}°C
            </div>
            <div className="text-xs text-gray-600">Temperatura</div>
          </div>
        </div>

        {/* Humedad */}
        <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-xl">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Droplets className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-800">
              {weather.humidity}%
            </div>
            <div className="text-xs text-gray-600">Humedad</div>
          </div>
        </div>

        {/* Precipitación */}
        <div className="flex items-center space-x-3 p-3 bg-cyan-50 rounded-xl">
          <div className="flex-shrink-0 w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center text-lg">
            {getRainIcon(weather.precipitation)}
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-800">
              {weather.precipitation} mm
            </div>
            <div className="text-xs text-gray-600">Precipitación</div>
          </div>
        </div>

        {/* Nubosidad */}
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
          <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <Eye className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-800">
              {weather.cloudCover}%
            </div>
            <div className="text-xs text-gray-600">Nubosidad</div>
          </div>
        </div>
      </div>

      {/* Viento - Full width */}
      <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-xl">
              {getWindIcon(weather.windSpeed)}
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-800">
                {weather.windSpeed.toFixed(1)} km/h
              </div>
              <div className="text-sm text-gray-600">
                {formatWindDirection(weather.windDirection)} • Rachas: {weather.gustSpeed.toFixed(1)} km/h
              </div>
            </div>
          </div>
          <div className="text-right">
            <Wind className="w-6 h-6 text-gray-500 mx-auto mb-1" />
            <div className="text-xs text-gray-500">Viento</div>
          </div>
        </div>
      </div>

      {/* Presión - Full width */}
      <div className="mt-3 p-4 bg-purple-50 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Gauge className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-800">
                {weather.pressure.toFixed(1)} hPa
              </div>
              <div className="text-sm text-gray-600">
                Presión atmosférica
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
              weather.pressure > 1020 
                ? 'bg-red-100 text-red-600' 
                : weather.pressure < 1000
                ? 'bg-blue-100 text-blue-600'
                : 'bg-green-100 text-green-600'
            }`}>
              {weather.pressure > 1020 ? 'Alta' : weather.pressure < 1000 ? 'Baja' : 'Normal'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}