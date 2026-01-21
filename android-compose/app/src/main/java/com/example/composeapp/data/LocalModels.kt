package com.example.composeapp.data

import java.time.Instant

// Equivalent to src/lib weather/astro/hydro types for local scoring

data class WeatherData(
    val time: String,
    val temperature: Double,
    val windSpeed: Double,
    val windDirection: Double,
    val cloudCover: Double,
    val precipitation: Double,
    val humidity: Double,
    val pressure: Double,
    val visibility: Double,
    val uvIndex: Double,
    val gustSpeed: Double,
    val dewPoint: Double?,
    val isDay: Boolean?
)

data class MarineData(
    val time: String,
    val waveHeight: Double,
    val waveDirection: Double?,
    val wavePeriod: Double?,
    val swellHeight: Double?,
    val swellPeriod: Double?,
    val swellDirection: Double?
)

data class AstroData(
    val sunrise: String,
    val sunset: String,
    val moonrise: String?,
    val moonset: String?,
    val moonPhase: Double,
    val moonIllumination: Double
)

data class HydroData(
    val waterLevel: Double?,
    val waterFlow: Double?,
    val provider: String?,
    val lastUpdate: String?
)

data class ActivityScore(
    val overall: Int,
    val reasons: List<String>,
    val bestWindows: List<ActivityWindow>
)

data class DerivedWeatherFeatures(
    val deltaPressure1h: Double?,
    val deltaPressure3hAvg: Double?,
    val deltaTemp1h: Double?,
    val rainPrev6h: Double?,
    val rainSum24h: Double?,
    val windStability3h: Double?
)

data class ForecastData(
    val time: String,
    val weather: WeatherData,
    val marine: MarineData?,
    val astronomy: AstroData,
    val hydro: HydroData?,
    val activity: ActivityScore,
    val location: Location
)

fun Instant.toIsoString(): String = toString()
