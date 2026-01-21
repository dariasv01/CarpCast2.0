package com.example.composeapp.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.composeapp.ui.components.SectionCard

@Composable
fun SettingsScreen(onBack: () -> Unit) {
    var notificationsEnabled by remember { mutableStateOf(true) }
    var locationEnabled by remember { mutableStateOf(true) }
    var autoRefresh by remember { mutableStateOf(false) }

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
                Text(text = "Configuración", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.size(48.dp))
            }
        }
        item {
            SectionCard {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(text = "Preferencias", style = MaterialTheme.typography.titleSmall)
                    SettingToggle(
                        title = "Notificaciones",
                        description = "Alertas cuando el índice sea alto",
                        icon = Icons.Default.Notifications,
                        checked = notificationsEnabled,
                        onCheckedChange = { notificationsEnabled = it }
                    )
                    SettingToggle(
                        title = "Ubicación",
                        description = "Usar GPS para sugerencias rápidas",
                        icon = Icons.Default.Place,
                        checked = locationEnabled,
                        onCheckedChange = { locationEnabled = it }
                    )
                    SettingToggle(
                        title = "Actualización automática",
                        description = "Sincroniza el pronóstico cada hora",
                        icon = Icons.Default.Refresh,
                        checked = autoRefresh,
                        onCheckedChange = { autoRefresh = it }
                    )
                }
            }
        }
    }
}

@Composable
private fun SettingToggle(
    title: String,
    description: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Icon(imageVector = icon, contentDescription = null)
                Column {
                    Text(text = title, style = MaterialTheme.typography.bodyMedium)
                    Text(text = description, style = MaterialTheme.typography.labelSmall)
                }
            }
            Switch(checked = checked, onCheckedChange = onCheckedChange)
        }
    }
}
