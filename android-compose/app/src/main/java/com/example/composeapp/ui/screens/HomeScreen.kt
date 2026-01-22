@file:OptIn(ExperimentalMaterial3Api::class)

package com.example.composeapp.ui.screens

import android.webkit.GeolocationPermissions
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.MapPin
import androidx.compose.material.icons.filled.Opacity
import androidx.compose.material.icons.filled.Pets
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Waves
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.composeapp.data.FeatureCard
import com.example.composeapp.data.FishSpecies
import com.example.composeapp.data.ForecastEntry
import com.example.composeapp.data.ForecastRepository
import com.example.composeapp.data.ForecastQuery
import com.example.composeapp.data.Location
import com.example.composeapp.data.QuickAction
import com.example.composeapp.ui.components.SectionCard
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import androidx.compose.ui.viewinterop.AndroidView

@Composable
fun HomeScreen(
    onNavigateToForecast: (ForecastQuery) -> Unit,
    onNavigateToFavorites: () -> Unit,
    onNavigateToSettings: () -> Unit
) {
    var selectedSpecies by remember { mutableStateOf(FishSpecies.Carp) }
    var selectedLocation by remember { mutableStateOf<Location?>(null) }
    var searchQuery by remember { mutableStateOf("") }
    var showMap by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(false) }
    var searchResults by remember { mutableStateOf<List<Location>>(emptyList()) }
    var searchError by remember { mutableStateOf<String?>(null) }

    val scope = rememberCoroutineScope()

    LaunchedEffect(searchQuery) {
        if (searchQuery.isBlank()) {
            searchResults = emptyList()
            searchError = null
            return@LaunchedEffect
        }
        if (searchQuery.length < 2) {
            searchResults = emptyList()
            searchError = "Introduce al menos 2 caracteres"
            return@LaunchedEffect
        }
        delay(300)
        try {
            searchResults = ForecastRepository.searchPlaces(searchQuery, limit = 5)
            searchError = null
        } catch (error: Exception) {
            searchResults = emptyList()
            searchError = "No se pudo buscar ubicaciones"
        }
    }

    val featureCards = remember {
        listOf(
            FeatureCard("Meteorología", "Viento, presión, lluvia"),
            FeatureCard("Astronomía", "Sol, luna, mareas"),
            FeatureCard("Hidrología", "Nivel, caudal*"),
            FeatureCard("Mapa Global", "Selección visual")
        )
    }

    val featureIcons = remember {
        listOf(
            Icons.Default.Cloud,
            Icons.Default.Schedule,
            Icons.Default.Opacity,
            Icons.Default.Map
        )
    }

    val quickActions = remember {
        listOf(
            QuickAction("Lugares Favoritos", "Guarda tus mejores pesqueros"),
            QuickAction("Configuración", "Alertas y preferencias")
        )
    }

    val quickActionIcons = remember {
        listOf(Icons.Default.Star, Icons.Default.Settings)
    }

    val backgroundBrush = remember {
        Brush.verticalGradient(
            listOf(
                Color(0xFFEAF4FF),
                Color(0xFFDDF6FF),
                Color(0xFFF5FBFF)
            )
        )
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(backgroundBrush)
    ) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            item {
                HeaderSection()
            }
            item {
                HeroSection()
            }
            item {
                SpeciesSection(selectedSpecies = selectedSpecies, onSelectSpecies = { selectedSpecies = it })
            }
            item {
                LocationSection(
                    selectedLocation = selectedLocation,
                    searchQuery = searchQuery,
                    searchResults = searchResults,
                    searchError = searchError,
                    showMap = showMap,
                    isLoading = isLoading,
                    onSearchQueryChange = { searchQuery = it },
                    onUseCurrentLocation = {
                        scope.launch {
                            isLoading = true
                            delay(600)
                            selectedLocation = Location("Madrid, España", 40.4168, -3.7038)
                            searchQuery = selectedLocation?.name.orEmpty()
                            isLoading = false
                        }
                    },
                    onToggleMap = { showMap = !showMap },
                    onSelectLocation = {
                        selectedLocation = it
                        searchQuery = ""
                    },
                    onClearSelection = { selectedLocation = null },
                    onGetForecast = {
                        val location = selectedLocation ?: searchResults.firstOrNull()
                        if (location == null) return@LocationSection
                        onNavigateToForecast(
                            ForecastQuery(
                                species = selectedSpecies.name,
                                mode = selectedSpecies.mode.name,
                                locationName = location.name,
                                latitude = location.latitude.toString(),
                                longitude = location.longitude.toString()
                            )
                        )
                    }
                )
            }
            item {
                FeatureGrid(featureCards, featureIcons)
            }
            item {
                InfoCard()
            }
            item {
                QuickAccessSection(
                    actions = quickActions,
                    icons = quickActionIcons,
                    onFavoritesClick = onNavigateToFavorites,
                    onSettingsClick = onNavigateToSettings
                )
            }
            item {
                ForecastPreview()
            }
        }
    }
}

@Composable
private fun HeaderSection() {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(
                        Brush.linearGradient(
                            listOf(Color(0xFF2196F3), Color(0xFF00BCD4))
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Pets,
                    contentDescription = null,
                    tint = Color.White
                )
            }
            Text(
                text = "CarpCast 2.0",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
        }
        Text(
            text = "Pronóstico Global de Actividad de Pesca",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun HeroSection() {
    SectionCard(
        modifier = Modifier.fillMaxWidth(),
        borderColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(
                modifier = Modifier
                    .size(72.dp)
                    .clip(CircleShape)
                    .background(
                        Brush.linearGradient(
                            listOf(Color(0xFF2196F3), Color(0xFF00BCD4))
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Waves,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(36.dp)
                )
            }
            Text(
                text = "Pronóstico de Pesca",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "Obtén el índice de actividad (0-100) para cualquier lugar del mundo",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun SpeciesSection(
    selectedSpecies: FishSpecies,
    onSelectSpecies: (FishSpecies) -> Unit
) {
    SectionCard(
        modifier = Modifier.fillMaxWidth(),
        borderColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(text = "Especie Objetivo", style = MaterialTheme.typography.titleSmall)
            val speciesList = FishSpecies.values().toList()
            val rows = speciesList.chunked(2)
            rows.forEach { row ->
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                    row.forEach { species ->
                        val isSelected = selectedSpecies == species
                        Card(
                            onClick = { onSelectSpecies(species) },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Column(
                                modifier = Modifier
                                    .background(
                                        if (isSelected) MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)
                                        else MaterialTheme.colorScheme.surfaceVariant
                                    )
                                    .padding(12.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(text = species.label, style = MaterialTheme.typography.bodyMedium)
                                Text(text = species.mode.label, style = MaterialTheme.typography.labelSmall)
                            }
                        }
                    }
                    if (row.size == 1) {
                        Spacer(modifier = Modifier.weight(1f))
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LocationSection(
    selectedLocation: Location?,
    searchQuery: String,
    searchResults: List<Location>,
    searchError: String?,
    showMap: Boolean,
    isLoading: Boolean,
    onSearchQueryChange: (String) -> Unit,
    onUseCurrentLocation: () -> Unit,
    onToggleMap: () -> Unit,
    onSelectLocation: (Location) -> Unit,
    onClearSelection: () -> Unit,
    onGetForecast: () -> Unit
) {
    SectionCard(
        modifier = Modifier.fillMaxWidth(),
        borderColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(text = "Seleccionar Ubicación", style = MaterialTheme.typography.titleSmall)

            if (selectedLocation != null) {
                SelectedLocationCard(location = selectedLocation, onClearSelection = onClearSelection)
            }

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                Button(
                    onClick = onUseCurrentLocation,
                    enabled = !isLoading,
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(imageVector = Icons.Default.MapPin, contentDescription = null)
                    Spacer(modifier = Modifier.size(6.dp))
                    Text(text = if (isLoading) "Obteniendo..." else "Mi ubicación")
                }
                OutlinedButton(onClick = onToggleMap, modifier = Modifier.weight(1f)) {
                    Icon(imageVector = Icons.Default.Map, contentDescription = null)
                    Spacer(modifier = Modifier.size(6.dp))
                    Text(text = if (showMap) "Ocultar mapa" else "Ver mapa")
                }
            }

            OutlinedTextField(
                value = searchQuery,
                onValueChange = onSearchQueryChange,
                leadingIcon = { Icon(imageVector = Icons.Default.Search, contentDescription = null) },
                placeholder = { Text("Buscar lugar (ej. Madrid, España)") },
                modifier = Modifier.fillMaxWidth()
            )

            if (searchError != null) {
                Text(
                    text = searchError,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.error
                )
            }

            if (searchResults.isNotEmpty() && searchQuery.isNotBlank()) {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    searchResults.take(4).forEach { result ->
                        Card(
                            onClick = { onSelectLocation(result) },
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text(text = result.name, style = MaterialTheme.typography.bodyMedium)
                                Text(
                                    text = "${result.latitude}, ${result.longitude}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            }

            if (showMap) {
                MapPreview(
                    location = selectedLocation ?: Location("Madrid, España", 40.4168, -3.7038),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp)
                        .clip(RoundedCornerShape(20.dp))
                )
            }

            Button(
                onClick = onGetForecast,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
            ) {
                Text(text = "Obtener Pronóstico")
            }
        }
    }
}

@Composable
private fun SelectedLocationCard(location: Location, onClearSelection: () -> Unit) {
    Surface(
        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
        shape = RoundedCornerShape(16.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(text = location.name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                Text(
                    text = "${location.latitude}, ${location.longitude}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            OutlinedButton(onClick = onClearSelection) {
                Text(text = "Quitar")
            }
        }
    }
}

@Composable
private fun FeatureGrid(cards: List<FeatureCard>, icons: List<ImageVector>) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        cards.chunked(2).forEachIndexed { rowIndex, row ->
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                row.forEachIndexed { columnIndex, card ->
                    val iconIndex = rowIndex * 2 + columnIndex
                    SectionCard(modifier = Modifier.weight(1f)) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = icons.getOrElse(iconIndex) { Icons.Default.Waves },
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary
                                )
                            }
                            Text(text = card.title, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                            Text(text = card.subtitle, style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }
                if (row.size == 1) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun InfoCard() {
    SectionCard {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(text = "¿Cómo funciona?", style = MaterialTheme.typography.titleSmall)
            Text(text = "• Analizamos 15+ factores meteorológicos y astronómicos", style = MaterialTheme.typography.bodySmall)
            Text(text = "• Calculamos un índice de actividad de 0 a 100", style = MaterialTheme.typography.bodySmall)
            Text(text = "• Identificamos las mejores ventanas del día", style = MaterialTheme.typography.bodySmall)
            Text(text = "• Explicamos cada factor que afecta la puntuación", style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun QuickAccessSection(
    actions: List<QuickAction>,
    icons: List<ImageVector>,
    onFavoritesClick: () -> Unit,
    onSettingsClick: () -> Unit
) {
    SectionCard(
        modifier = Modifier.fillMaxWidth(),
        borderColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(text = "Acceso Rápido", style = MaterialTheme.typography.titleSmall)
            actions.forEachIndexed { index, action ->
                val onClick = if (index == 0) onFavoritesClick else onSettingsClick
                Card(
                    onClick = onClick,
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(MaterialTheme.colorScheme.surfaceVariant),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = icons.getOrElse(index) { Icons.Default.Star },
                                contentDescription = null
                            )
                        }
                        Column {
                            Text(text = action.title, style = MaterialTheme.typography.bodyMedium)
                            Text(text = action.subtitle, style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ForecastPreview() {
    var previewEntries by remember { mutableStateOf<List<ForecastEntry>>(emptyList()) }
    var previewError by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        try {
            val result = ForecastRepository.fetchForecast(ForecastQuery(), days = 1)
            previewEntries = result.entries.take(3)
        } catch (error: Exception) {
            previewEntries = emptyList()
            previewError = "No se pudo cargar la vista previa"
        }
    }
    SectionCard(
        modifier = Modifier.fillMaxWidth(),
        borderColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(text = "Vista previa de pronóstico", style = MaterialTheme.typography.titleSmall)
            if (previewError != null) {
                Text(
                    text = previewError ?: "",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.error
                )
            }
            previewEntries.forEach { entry ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(text = formatTimeLabel(entry.timeLabel), style = MaterialTheme.typography.bodySmall)
                    Text(text = "${entry.activityScore}", style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }
}

private fun formatTimeLabel(timeLabel: String): String {
    return if (timeLabel.contains("T")) {
        timeLabel.substringAfter("T").take(5)
    } else {
        timeLabel
    }
}

@Composable
private fun MapPreview(location: Location, modifier: Modifier = Modifier) {
    val html = remember(location) { mapHtml(location.latitude, location.longitude) }
    AndroidView(
        modifier = modifier,
        factory = { context ->
            WebView(context).apply {
                settings.apply {
                    javaScriptEnabled = true
                    domStorageEnabled = true
                    allowContentAccess = true
                    allowFileAccess = true
                    setGeolocationEnabled(true) // Enable geolocation
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.JELLY_BEAN) {
                        @Suppress("DEPRECATION")
                        allowUniversalAccessFromFileURLs = true
                    }
                }

                // WebViewClient for page load events
                webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView?, url: String?) {
                        view?.evaluateJavascript(
                            "if (typeof updateLocation === 'function') updateLocation(${location.latitude}, ${location.longitude});",
                            null
                        )
                    }
                }

                // WebChromeClient for geolocation permissions
                webChromeClient = object : WebChromeClient() {
                    override fun onGeolocationPermissionsShowPrompt(
                        origin: String?,
                        callback: GeolocationPermissions.Callback?
                    ) {
                        // Grant geolocation permission to the WebView content
                        callback?.invoke(origin, true, false)
                    }
                }

                setLayerType(android.view.View.LAYER_TYPE_HARDWARE, null)
                setBackgroundColor(android.graphics.Color.TRANSPARENT)
                loadDataWithBaseURL(null, html, "text/html", "utf-8", null)
            }
        },
        update = { view ->
            view.post {
                view.evaluateJavascript(
                    "if (typeof updateLocation === 'function') updateLocation(${location.latitude}, ${location.longitude});",
                    null
                )
            }
        }
    )
}

private fun mapHtml(latitude: Double, longitude: Double): String {
    return """
        <!DOCTYPE html>
        <html>
        <head>
          <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
          <link rel=\"stylesheet\" href=\"https://unpkg.com/leaflet@1.9.4/dist/leaflet.css\" />
          <style>
            html, body { margin: 0; height: 100%; }
            #map { width: 100%; height: 100%; }
            .location-button {
              position: absolute;
              top: 10px;
              right: 10px;
              z-index: 1000;
              background: white;
              border: 2px solid rgba(0,0,0,0.2);
              border-radius: 4px;
              width: 34px;
              height: 34px;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 20px;
              box-shadow: 0 1px 5px rgba(0,0,0,0.3);
            }
            .location-button:hover {
              background: #f4f4f4;
            }
            .location-button:active {
              background: #e0e0e0;
            }
          </style>
        </head>
        <body>
          <button class=\"location-button\" onclick=\"getMyLocation()\" title=\"Mi ubicación\">📍</button>
          <div id=\"map\"></div>
          <script src=\"https://unpkg.com/leaflet@1.9.4/dist/leaflet.js\"></script>
          <script>
            var map = L.map('map').setView([$latitude, $longitude], 10);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 19,
              attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);
            var marker = L.marker([$latitude, $longitude]).addTo(map);
            
            function updateLocation(lat, lng) {
              map.setView([lat, lng], 10);
              marker.setLatLng([lat, lng]);
            }
            
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
          </script>
        </body>
        </html>
    """.trimIndent()
}
