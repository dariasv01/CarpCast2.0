package com.example.composeapp.ui.screens

import androidx.compose.foundation.background
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
import androidx.compose.material.icons.filled.MapPin
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.composeapp.data.FakeForecastRepository
import com.example.composeapp.data.ForecastEntry
import com.example.composeapp.data.ForecastQuery
import com.example.composeapp.ui.components.SectionCard

@Composable
fun ForecastScreen(
    query: ForecastQuery,
    onBack: () -> Unit
) {
    val dayForecasts = remember { FakeForecastRepository.dayForecasts() }
    var selectedDayIndex by remember { mutableIntStateOf(0) }
    val selectedDay = dayForecasts.getOrNull(selectedDayIndex)

    LazyColumn(
        modifier = Modifier
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 20.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            TopBar(title = "Pronóstico", onBack = onBack)
        }
        item {
            LocationSummary(query = query)
        }
        item {
            DayTabs(
                dayLabels = dayForecasts.map { it.dayLabel },
                selectedIndex = selectedDayIndex,
                onSelect = { selectedDayIndex = it }
            )
        }
        if (selectedDay != null) {
            item {
                ActivityScoreCard(entry = selectedDay.entries.first())
            }
            items(selectedDay.entries) { entry ->
                ForecastEntryRow(entry = entry)
            }
        }
    }
}

@Composable
private fun TopBar(title: String, onBack: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        IconButton(onClick = onBack) {
            Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Volver")
        }
        Text(text = title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.size(48.dp))
    }
}

@Composable
private fun LocationSummary(query: ForecastQuery) {
    SectionCard {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Icon(imageVector = Icons.Default.MapPin, contentDescription = null)
            Column {
                Text(text = query.locationName, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                Text(
                    text = "${query.latitude}, ${query.longitude}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = "${query.mode} · ${query.species}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
private fun DayTabs(dayLabels: List<String>, selectedIndex: Int, onSelect: (Int) -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
        dayLabels.forEachIndexed { index, label ->
            val selected = index == selectedIndex
            Button(
                onClick = { onSelect(index) },
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                    contentColor = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface
                )
            ) {
                Text(text = label)
            }
        }
    }
}

@Composable
private fun ActivityScoreCard(entry: ForecastEntry) {
    SectionCard {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(text = "Índice de actividad", style = MaterialTheme.typography.titleSmall)
            Text(
                text = entry.activityScore.toString(),
                style = MaterialTheme.typography.displaySmall,
                color = MaterialTheme.colorScheme.primary
            )
            Text(text = "Mejor ventana: ${entry.timeLabel}", style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun ForecastEntryRow(entry: ForecastEntry) {
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
            Text(text = entry.timeLabel, style = MaterialTheme.typography.bodyMedium)
            Column(horizontalAlignment = Alignment.End) {
                Text(text = "${entry.activityScore}", fontWeight = FontWeight.Bold)
                Text(text = "${entry.temperatureC}°C · ${entry.windKph} km/h", style = MaterialTheme.typography.labelSmall)
                Text(text = "${entry.pressureHpa} hPa", style = MaterialTheme.typography.labelSmall)
            }
        }
    }
}
