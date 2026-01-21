package com.example.composeapp.data

import kotlin.random.Random

object FakeLocationRepository {
    private val seeds = listOf(
        Location("Madrid, España", 40.4168, -3.7038),
        Location("Valencia, España", 39.4699, -0.3763),
        Location("Sevilla, España", 37.3891, -5.9845),
        Location("Bilbao, España", 43.2630, -2.9350)
    )

    fun search(query: String): List<Location> {
        if (query.isBlank()) return emptyList()
        return seeds.filter { it.name.contains(query, ignoreCase = true) }.ifEmpty { seeds }
    }

    fun currentLocation(): Location = Location("Ubicación actual", 40.4168, -3.7038)
}

object FakeForecastRepository {
    fun dayForecasts(): List<DayForecast> {
        val labels = listOf("Hoy", "Mañana", "Pasado")
        return labels.map { label ->
            DayForecast(
                dayLabel = label,
                entries = List(6) { index ->
                    ForecastEntry(
                        timeLabel = "${6 + index * 3}:00",
                        activityScore = Random.nextInt(35, 96),
                        temperatureC = Random.nextInt(12, 29),
                        windKph = Random.nextInt(4, 26),
                        pressureHpa = Random.nextInt(1005, 1025)
                    )
                }
            )
        }
    }
}
