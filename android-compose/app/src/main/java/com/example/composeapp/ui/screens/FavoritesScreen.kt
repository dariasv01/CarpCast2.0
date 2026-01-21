package com.example.composeapp.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.composeapp.data.FavoriteSpot
import com.example.composeapp.data.ForecastRepository
import com.example.composeapp.ui.components.SectionCard

@Composable
fun FavoritesScreen(onBack: () -> Unit) {
    var favorites by remember { mutableStateOf<List<FavoriteSpot>>(emptyList()) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        try {
            favorites = ForecastRepository.fetchFavorites()
        } catch (error: Exception) {
            errorMessage = "No se pudieron cargar los favoritos"
        }
    }

    LazyColumn(
        modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                IconButton(onClick = onBack) {
                    Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Volver")
                }
                Text(text = "Favoritos", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.size(48.dp))
            }
        }
        item {
            SectionCard {
                Text(
                    text = "Tus lugares guardados",
                    style = MaterialTheme.typography.titleSmall
                )
            }
        }
        if (errorMessage != null) {
            item {
                Text(text = errorMessage.orEmpty(), color = MaterialTheme.colorScheme.error)
            }
        }
        if (favorites.isEmpty() && errorMessage == null) {
            item {
                Text(text = "Aún no hay favoritos guardados.", style = MaterialTheme.typography.bodySmall)
            }
        }
        items(favorites) { location ->
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(text = location.name, style = MaterialTheme.typography.bodyMedium)
                        Text(
                            text = "${location.latitude}, ${location.longitude}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Icon(imageVector = Icons.Default.Star, contentDescription = null)
                }
            }
        }
    }
}
