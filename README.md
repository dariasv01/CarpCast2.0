# 🎣 CarpCast 2.0 - Pronóstico Global de Actividad de Pesca

Una aplicación web móvil-first que proporciona pronósticos de actividad de pesca basados en datos meteorológicos, astronómicos e hidrológicos en tiempo real para cualquier coordenada del planeta.

## 🌟 Características Principales

### ⭐ Pronóstico Global
- **Funciona en cualquier coordenada del planeta**
- Índice de actividad de pesca de 0-100 por horas
- Explicación detallada de factores que influyen en la puntuación
- Identificación de mejores ventanas del día

### 📱 Móvil-First
- Diseño optimizado para dispositivos móviles
- Interfaz responsiva y touch-friendly
- Funciona sin conexión (PWA ready)
- Soporte para geolocalización

### 🎯 Modalidades Especializadas
- **Carpfishing**: Optimizado para carpa, barbos, pesca de fondo
- **Depredadores**: Optimizado para lucio, bass, pesca activa
- Algoritmos ajustados por especie y técnica

### 🌊 Datos Integrados
- **Meteorología**: Viento, presión, temperatura, precipitación, nubosidad
- **Astronomía**: Amanecer, atardecer, fases lunares, ventanas doradas
- **Hidrología**: Nivel y caudal del agua (donde esté disponible)
- **Datos marinos**: Oleaje para pesca costera

### ⭐ Sistema de Favoritos
- Guardar lugares de pesca con notas personalizadas
- Etiquetas por especies y características
- Rating por ubicación
- Acceso rápido a pronósticos

### 🚨 Sistema de Alertas
- Alertas por umbral de actividad
- Notificaciones de cambios meteorológicos
- Alertas personalizadas por lugar favorito

## 🔧 Tecnologías Utilizadas

### Frontend
- **Next.js 14** con App Router
- **TypeScript** para type safety
- **Tailwind CSS** para styling
- **Lucide React** para iconos

### Backend
- **Next.js API Routes**
- **Node.js** runtime
- **Prisma ORM** con SQLite
- Cache en memoria con TTL

### APIs Externas (Todas Gratuitas)
- **Open-Meteo**: Datos meteorológicos y marinos globales
- **USNO/Sunrise-Sunset**: Datos astronómicos
- **OpenStreetMap Nominatim**: Geocoding
- **USGS Water Services**: Datos hidrológicos (EE.UU.)
- **FarmSense**: Fases lunares

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 18+ 
- npm o yarn

### Instalación
```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/carpcast-2.git
cd carpcast-2

# Instalar dependencias
npm install

# Configurar base de datos
npx prisma generate
npx prisma db push

# Ejecutar en desarrollo
npm run dev
```

### Variables de Entorno
```bash
# .env.local
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# (Opcional) Explicación del pronóstico con IA (gratuita/local con Ollama)
# 1) Instala Ollama: https://ollama.com/download
# 2) Descarga un modelo: ollama pull llama3.1:8b
# 3) Ollama expone API OpenAI-compatible en http://localhost:11434/v1
OPENAI_API_KEY="ollama"  # cualquier texto (solo para activar el modo IA)
OPENAI_BASE_URL="http://localhost:11434/v1"
OPENAI_MODEL="llama3.1:8b"
```

#### IA Online (consulta por internet)
El endpoint `POST /api/explain` es compatible con APIs tipo OpenAI. Para usar IA online necesitas una cuenta + API key del proveedor.

Ejemplo con Groq (suele tener free tier):
```bash
OPENAI_API_KEY="tu_key"
OPENAI_BASE_URL="https://api.groq.com/openai/v1"
OPENAI_MODEL="llama-3.1-8b-instant"
```

Ejemplo con OpenRouter:
```bash
OPENAI_API_KEY="tu_key"
OPENAI_BASE_URL="https://openrouter.ai/api/v1"
OPENAI_MODEL="meta-llama/llama-3.1-8b-instruct"
```

## 📡 APIs y Endpoints

### Pronóstico de Actividad
```http
GET /api/forecast?lat=40.7128&lng=-74.0060&mode=carpfishing&days=3
```

**Parámetros:**
- `lat`: Latitud (requerido)
- `lng`: Longitud (requerido)  
- `mode`: `carpfishing` | `predator` (por defecto: carpfishing)
- `days`: Días de pronóstico (por defecto: 3, máximo: 7)

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "location": {
      "latitude": 40.7128,
      "longitude": -74.0060,
      "name": "Nueva York, NY"
    },
    "forecasts": [...],
    "bestWindows": [...],
    "dataAvailability": {
      "weather": true,
      "astro": true,
      "hydro": false,
      "marine": true
    }
  }
}
```

### Geocoding
```http
# Buscar lugares
GET /api/places/search?q=Madrid%20Spain&limit=5

# Geocoding inverso
GET /api/places/reverse?lat=40.4168&lng=-3.7038
```

### Lugares Favoritos
```http
# Obtener favoritos
GET /api/favorites

# Crear favorito
POST /api/favorites
{
  "name": "Río Tajo - Toledo",
  "latitude": 39.8628,
  "longitude": -4.0273,
  "notes": "Excelente para carpas grandes",
  "species": ["carp", "barbel"],
  "rating": 5
}

# Actualizar favorito
PUT /api/favorites/[id]

# Eliminar favorito
DELETE /api/favorites/[id]
```

### Datos Hidrológicos
```http
GET /api/hydro?lat=40.7128&lng=-74.0060
```

### Explicación (IA)
```http
POST /api/explain
```

Devuelve un texto explicando el motivo del score para una hora concreta.

- Si `OPENAI_API_KEY` no está configurada, hace fallback a una explicación local basada en `reasons[]`.
- Si configuras Ollama (gratis/local), se usa como proveedor IA.

### Alertas
```http
# Obtener alertas
GET /api/alerts

# Crear alerta
POST /api/alerts
{
  "type": "activity",
  "condition": "Actividad alta en amanecer",
  "threshold": 75,
  "spotId": "spot_id_opcional"
}
```

## 🧮 Algoritmo de Puntuación

El índice de actividad (0-100) se calcula combinando múltiples factores:

### Factores Meteorológicos (40%)
- **Presión atmosférica** (0-15 pts): Favorece tendencias bajando suavemente
- **Viento** (0-10 pts): Brisa moderada suma, rachas fuertes penalizan
- **Precipitación** (0-8 pts): Lluvia ligera activa, tormenta penaliza
- **Nubosidad** (0-5 pts): Moderada suma, extremos ajustan
- **Temperatura** (0-2 pts): Estabilidad suma

### Factores Astronómicos (30%)
- **Ventanas doradas** (0-15 pts): Amanecer/atardecer bonus máximo
- **Fase lunar** (0-10 pts): Luna nueva/llena favorecidas
- **Período nocturno** (0-5 pts): Bonus para depredadores

### Factores Hidrológicos (30%)
- **Tendencia del agua** (0-15 pts): Nivel subiendo suma puntos
- **Disponibilidad de datos** (0-15 pts): Base por datos válidos

### Factores Marinos (10% bonus)
- **Condiciones de oleaje**: Para pesca costera

## 🌍 Cobertura Global y Degradación Elegante

### Disponibilidad por Región

#### 🌐 Global (100% cobertura)
- Datos meteorológicos: Open-Meteo
- Datos astronómicos: USNO/Sunrise-Sunset
- Geocoding: OpenStreetMap

#### 🇺🇸 Estados Unidos
- Hidrología: USGS Water Services
- Cobertura completa incluyendo Alaska y Hawaii

#### 🇪🇺 Europa y Otros
- Hidrología: En desarrollo (sistema modular listo)
- La app funciona sin datos hidrológicos

### Degradación Elegante
- Si no hay datos hidrológicos: peso redistribuido a otros factores
- Si falla geocoding: coordenadas como nombre de lugar
- Si falla astronomía: datos por defecto manteniendo funcionalidad

## 🔒 Privacidad y Rate Limiting

### Respeto a APIs Gratuitas
- **Nominatim**: Máximo 1 request/segundo
- Cache agresivo para geocoding (7 días)
- User-Agent identificable
- Atribuciones requeridas en footer

### Privacidad
- No se recopilan datos personales
- Favoritos almacenados localmente
- Solo coordenadas enviadas a APIs públicas

## 🚀 Despliegue

### Vercel (Recomendado)
```bash
# Conectar repositorio a Vercel
# Variables de entorno en dashboard de Vercel
vercel deploy
```

### Docker
```dockerfile
# Incluir Dockerfile en el proyecto para deployment custom
FROM node:18-alpine
# ... configuración Docker
```

## 📱 PWA (Progressive Web App)

```json
// public/manifest.json
{
  "name": "CarpCast 2.0",
  "short_name": "CarpCast",
  "description": "Pronóstico Global de Pesca",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0ea5e9",
  "theme_color": "#0ea5e9",
  "icons": [...]
}
```

## 🔮 Roadmap Futuro

### Fase 2
- [ ] PWA completa con offline support
- [ ] Push notifications para alertas
- [ ] Integración con más proveedores hidrológicos (Europa, Canadá)
- [ ] Machine learning para mejorar predicciones

### Fase 3
- [ ] App móvil nativa (React Native)
- [ ] Integración con redes sociales de pesca
- [ ] Comunidad de usuarios y reseñas
- [ ] Datos históricos y análisis de tendencias

## 🤝 Contribuir

1. Fork el repositorio
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Añadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para detalles.

## 🙏 Agradecimientos

- **Open-Meteo**: Datos meteorológicos gratuitos de alta calidad
- **USNO**: Datos astronómicos precisos
- **OpenStreetMap**: Datos de geocoding y mapas abiertos
- **USGS**: Datos hidrológicos de EE.UU.
- **Comunidad de desarrolladores** que mantiene estas APIs abiertas

---

### 📞 Contacto

- **Email**: support@carpcast.app
- **GitHub**: [CarpCast 2.0 Repository](https://github.com/tu-usuario/carpcast-2)
- **Web**: [https://carpcast.app](https://carpcast.app)

---

🎣 **¡Buena pesca y tight lines!** 🎣