// Página de configuración y settings
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Bell, 
  Globe, 
  Zap, 
  Info,
  ExternalLink,
  Shield,
  Database,
  Smartphone,
  Moon,
  Sun,
  RotateCcw
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto');
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    loadAlerts();
    loadSettings();
  }, []);

  const loadAlerts = async () => {
    try {
      const response = await fetch('/api/alerts');
      const data = await response.json();
      
      if (data.success) {
        setAlerts(data.data);
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  const loadSettings = () => {
    // Cargar configuraciones desde localStorage
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'auto' || 'auto';
    const savedNotifications = localStorage.getItem('notifications') !== 'false';
    
    setTheme(savedTheme);
    setNotifications(savedNotifications);
  };

  const saveSettings = () => {
    localStorage.setItem('theme', theme);
    localStorage.setItem('notifications', notifications.toString());
  };

  const clearCache = async () => {
    if (confirm('¿Estás seguro de que quieres limpiar la caché? Esto puede ralentizar las próximas consultas.')) {
      // En un entorno real, llamarías a una API para limpiar el cache del servidor
      localStorage.clear();
      alert('Caché limpiada correctamente');
    }
  };

  useEffect(() => {
    saveSettings();
  }, [theme, notifications]);

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
            <h1 className="text-lg font-semibold text-gray-800">Configuración</h1>
            <div className="w-9 h-9" /> {/* Spacer */}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Appearance Section */}
        <div className="bg-white rounded-2xl p-4 shadow-lg border border-blue-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
            <Smartphone className="w-5 h-5" />
            <span>Apariencia</span>
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tema
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setTheme('light')}
                  className={`p-3 rounded-xl border-2 transition-colors ${
                    theme === 'light' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <Sun className="w-5 h-5 mx-auto mb-1" />
                  <div className="text-xs">Claro</div>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`p-3 rounded-xl border-2 transition-colors ${
                    theme === 'dark' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <Moon className="w-5 h-5 mx-auto mb-1" />
                  <div className="text-xs">Oscuro</div>
                </button>
                <button
                  onClick={() => setTheme('auto')}
                  className={`p-3 rounded-xl border-2 transition-colors ${
                    theme === 'auto' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <Smartphone className="w-5 h-5 mx-auto mb-1" />
                  <div className="text-xs">Auto</div>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-700">Notificaciones</div>
                <div className="text-xs text-gray-500">Recibir alertas de actividad</div>
              </div>
              <button
                onClick={() => setNotifications(!notifications)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  notifications ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                    notifications ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Alerts Section */}
        <div className="bg-white rounded-2xl p-4 shadow-lg border border-blue-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
              <Bell className="w-5 h-5" />
              <span>Alertas</span>
            </h2>
            <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
              {alerts.length} activas
            </span>
          </div>

          {alerts.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <div className="text-sm">No hay alertas configuradas</div>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.slice(0, 3).map((alert: any) => (
                <div key={alert.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-800">
                        {alert.condition}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {alert.type} • Umbral: {alert.threshold}
                      </div>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${
                      alert.enabled ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  </div>
                </div>
              ))}
              {alerts.length > 3 && (
                <div className="text-center pt-2">
                  <button className="text-sm text-blue-600 hover:underline">
                    Ver todas las alertas ({alerts.length})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Data Sources */}
        <div className="bg-white rounded-2xl p-4 shadow-lg border border-blue-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
            <Database className="w-5 h-5" />
            <span>Fuentes de Datos</span>
          </h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <div className="text-sm font-medium text-gray-800">Open-Meteo</div>
                <div className="text-xs text-gray-500">Datos meteorológicos globales</div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <div className="text-sm font-medium text-gray-800">USNO / Sunrise-Sunset</div>
                <div className="text-xs text-gray-500">Datos astronómicos</div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div>
                <div className="text-sm font-medium text-gray-800">USGS Water Services</div>
                <div className="text-xs text-gray-500">Datos hidrológicos (solo EE.UU.)</div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <div className="text-sm font-medium text-gray-800">OpenStreetMap</div>
                <div className="text-xs text-gray-500">Geocoding y mapas</div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Storage & Cache */}
        <div className="bg-white rounded-2xl p-4 shadow-lg border border-blue-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
            <Database className="w-5 h-5" />
            <span>Almacenamiento</span>
          </h2>
          
          <div className="space-y-4">
            <button
              onClick={clearCache}
              className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <RotateCcw className="w-5 h-5 text-gray-500" />
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-800">Limpiar Caché</div>
                  <div className="text-xs text-gray-500">Eliminar datos temporales almacenados</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* About */}
        <div className="bg-white rounded-2xl p-4 shadow-lg border border-blue-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
            <Info className="w-5 h-5" />
            <span>Acerca de CarpCast 2.0</span>
          </h2>
          
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              CarpCast 2.0 es una aplicación web móvil-first que proporciona pronósticos 
              de actividad de pesca basados en datos meteorológicos, astronómicos e 
              hidrológicos en tiempo real.
            </p>
            <div className="grid grid-cols-2 gap-4 py-3">
              <div>
                <div className="font-semibold text-gray-800">Versión</div>
                <div>2.0.0</div>
              </div>
              <div>
                <div className="font-semibold text-gray-800">Modalidades</div>
                <div>Carpfishing, Depredadores</div>
              </div>
            </div>
            <div className="pt-3 border-t border-gray-200">
              <div className="font-semibold text-gray-800 mb-2">APIs Utilizadas (Gratuitas):</div>
              <ul className="space-y-1 text-xs">
                <li>• Open-Meteo: Datos meteorológicos y marinos globales</li>
                <li>• USNO/Sunrise-Sunset: Datos astronómicos mundiales</li>
                <li>• OpenStreetMap Nominatim: Geocoding global</li>
                <li>• USGS Water Services: Hidrología (EE.UU.)</li>
                <li>• FarmSense: Fases lunares</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Privacy */}
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold text-blue-800 mb-1">Privacidad</div>
              <div className="text-blue-700">
                CarpCast 2.0 respeta tu privacidad. Todos los datos se procesan localmente 
                y solo se envían coordenadas necesarias a las APIs públicas para obtener 
                pronósticos. No se recopilan datos personales.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}