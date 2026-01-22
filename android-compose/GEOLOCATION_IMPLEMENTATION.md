# Implementación de Geolocalización en WebView

Este documento describe la implementación de la funcionalidad de geolocalización en el WebView del mapa para CarpCast 2.0 Android.

## Resumen de Cambios

Se han realizado modificaciones en tres archivos principales para habilitar la geolocalización en el WebView y el botón "Mi ubicación" en el mapa:

### 1. AndroidManifest.xml

**Cambios:**
- Agregados permisos de ubicación:
  - `ACCESS_FINE_LOCATION`: Permite acceso a ubicación GPS precisa
  - `ACCESS_COARSE_LOCATION`: Permite acceso a ubicación aproximada (red/WiFi)

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

### 2. MainActivity.kt

**Cambios:**
- Implementado sistema de solicitud de permisos en tiempo de ejecución
- Usa `ActivityResultContracts.RequestMultiplePermissions()` para Android 6.0+
- Solicita permisos al iniciar la app si no están concedidos

**Código clave:**
```kotlin
private val locationPermissionRequest = registerForActivityResult(
    ActivityResultContracts.RequestMultiplePermissions()
) { permissions ->
    when {
        permissions.getOrDefault(Manifest.permission.ACCESS_FINE_LOCATION, false) -> {
            // Ubicación precisa concedida
        }
        permissions.getOrDefault(Manifest.permission.ACCESS_COARSE_LOCATION, false) -> {
            // Ubicación aproximada concedida
        }
        else -> {
            // Sin permisos de ubicación
        }
    }
}
```

### 3. HomeScreen.kt

#### MapPreview Function

**Cambios en WebView Settings:**
- `javaScriptEnabled = true`: Habilita JavaScript necesario para el mapa
- `domStorageEnabled = true`: Permite almacenamiento DOM para Leaflet
- `setGeolocationEnabled(true)`: **Crucial** - Habilita API de geolocalización en WebView
- `allowContentAccess = true`: Permite acceso a contenido
- `allowFileAccess = true`: Permite acceso a archivos
- `allowUniversalAccessFromFileURLs = true`: Permite carga de recursos externos

**WebViewClient:**
- Implementado `onPageFinished()` para ejecutar JavaScript de forma segura
- Actualiza la ubicación del mapa después de que la página carga completamente

**WebChromeClient:**
```kotlin
webChromeClient = object : WebChromeClient() {
    override fun onGeolocationPermissionsShowPrompt(
        origin: String?,
        callback: GeolocationPermissions.Callback?
    ) {
        // Concede automáticamente permisos de geolocalización al contenido web
        callback?.invoke(origin, true, false)
    }
}
```

Este callback es **esencial** para que `navigator.geolocation` funcione en el WebView.

#### mapHtml Function

**Nuevo Botón de Ubicación:**
```html
<button class="location-button" onclick="getMyLocation()" title="Mi ubicación">📍</button>
```

Características del botón:
- Posicionado absolutamente en esquina superior derecha
- z-index: 1000 para estar sobre el mapa
- Estilo consistente con controles de Leaflet
- Icono de pin 📍 para identificación fácil

**Nueva Función JavaScript:**
```javascript
function getMyLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                var lat = position.coords.latitude;
                var lng = position.coords.longitude;
                updateLocation(lat, lng);
            },
            function(error) {
                console.error('Error getting location:', error.message);
                alert('No se pudo obtener la ubicación: ' + error.message);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    } else {
        alert('Geolocalización no soportada en este navegador');
    }
}
```

Características:
- Verifica disponibilidad de `navigator.geolocation`
- Usa `getCurrentPosition()` con callbacks de éxito y error
- Opciones configuradas para máxima precisión:
  - `enableHighAccuracy: true`: Solicita GPS si está disponible
  - `timeout: 10000`: 10 segundos máximo de espera
  - `maximumAge: 0`: No usar ubicaciones cacheadas
- Mensajes de error en español para el usuario

## Flujo de Funcionamiento

### Al Iniciar la App:

1. **MainActivity** verifica si tiene permisos de ubicación
2. Si NO tiene permisos → Muestra diálogo del sistema solicitándolos
3. Usuario concede o deniega permisos

### Al Mostrar el Mapa:

1. **HomeScreen** crea el WebView con todas las configuraciones
2. WebView carga el HTML del mapa con Leaflet
3. Mapa se inicializa mostrando la ubicación seleccionada o por defecto

### Al Presionar el Botón "Mi Ubicación":

1. JavaScript llama a `getMyLocation()`
2. Se ejecuta `navigator.geolocation.getCurrentPosition()`
3. WebView intercepta la solicitud de geolocalización
4. **WebChromeClient.onGeolocationPermissionsShowPrompt()** es invocado
5. Se concede permiso automáticamente (porque ya tenemos permisos Android)
6. Sistema operativo obtiene la ubicación actual
7. Callback de éxito recibe las coordenadas
8. Se llama a `updateLocation(lat, lng)` 
9. Mapa se centra en la nueva ubicación y mueve el marcador

## Pruebas Recomendadas

### En Emulador:
1. Configurar ubicación mock en Extended Controls del emulador (⋮ → Location)
2. Conceder permisos cuando la app los solicite
3. Presionar el botón "Ver mapa" en la pantalla principal
4. Presionar el botón 📍 en el mapa
5. Verificar que el mapa se centra en la ubicación configurada

### En Dispositivo Real:
1. Asegurar que GPS/ubicación está habilitada en el dispositivo
2. Conceder permisos cuando la app los solicite
3. Presionar el botón "Ver mapa" en la pantalla principal
4. Presionar el botón 📍 en el mapa
5. Verificar que el mapa se centra en la ubicación real del dispositivo

## Posibles Errores y Soluciones

### Error: "No se pudo obtener la ubicación: User denied Geolocation"
**Causa:** Usuario denegó permisos de ubicación a la app Android
**Solución:** Ir a Configuración → Apps → CarpCast → Permisos → Ubicación → Permitir

### Error: "No se pudo obtener la ubicación: Timeout expired"
**Causa:** El GPS no pudo obtener una ubicación en 10 segundos
**Solución:** 
- Asegurar estar en exteriores o cerca de ventanas (para GPS)
- Verificar que ubicación está habilitada en el dispositivo
- Intentar nuevamente

### Error: "Geolocalización no soportada en este navegador"
**Causa:** WebView muy antiguo o configuración incorrecta
**Solución:** Verificar que `setGeolocationEnabled(true)` está en el código

### El mapa no se muestra
**Causa:** JavaScript deshabilitado o problema de red
**Solución:**
- Verificar conectividad a Internet
- Verificar que `javaScriptEnabled = true`
- Revisar logs de Android Studio para errores de carga

## Consideraciones de Seguridad

### allowUniversalAccessFromFileURLs
Esta configuración está habilitada para permitir que el HTML cargado acceda a recursos de CDN (Leaflet CSS/JS).

**Riesgos:**
- Podría permitir scripts maliciosos si el HTML no es confiable
- Cross-site scripting si se inyecta contenido externo

**Mitigación:**
- El HTML es generado internamente por la app (no viene de Internet)
- No se permite input de usuario en el HTML
- Solo se usan CDNs confiables (unpkg.com para Leaflet)

### Permisos de Ubicación
Los permisos se solicitan siguiendo las mejores prácticas de Android:
- Solicitud en tiempo de ejecución (Android 6+)
- Usuario puede denegar sin romper la app
- Solo se usa para funcionalidad del mapa

## Próximos Pasos Opcionales

### Mejoras Sugeridas:

1. **Mostrar precisión de ubicación:**
   ```javascript
   var accuracy = position.coords.accuracy;
   L.circle([lat, lng], {radius: accuracy}).addTo(map);
   ```

2. **Seguimiento continuo:**
   ```javascript
   navigator.geolocation.watchPosition(updateLocation);
   ```

3. **Indicador de carga:**
   ```javascript
   // Mostrar spinner mientras obtiene ubicación
   button.innerHTML = '⏳';
   ```

4. **Guardar ubicación obtenida:**
   - Actualizar el estado en Compose cuando se obtiene ubicación
   - Usar para "Mi ubicación" en toda la app

5. **Solicitud de permisos contextual:**
   - Explicar por qué se necesitan permisos antes de solicitarlos
   - Mostrar dialog personalizado con razones

## Referencias

- [Android WebView Documentation](https://developer.android.com/reference/android/webkit/WebView)
- [Geolocation API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [Android Location Permissions](https://developer.android.com/training/location/permissions)
- [Leaflet Documentation](https://leafletjs.com/reference.html)

## Autor

Implementación realizada para CarpCast 2.0
Fecha: Enero 2026
