package com.example.composeapp.lib.scoring

import com.example.composeapp.data.ActivityScore
import com.example.composeapp.data.ActivityWindow
import com.example.composeapp.data.AstroData
import com.example.composeapp.data.DerivedWeatherFeatures
import com.example.composeapp.data.HydroData
import com.example.composeapp.data.WeatherData
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

object ActivityScoring {
    fun calculateSeries(
        weather: List<WeatherData>,
        astro: AstroData,
        hydro: HydroData?
    ): List<ActivityScore> {
        return weather.mapIndexed { index, w ->
            val derived = computeDerived(weather, index)
            calculateScore(w, astro, hydro, derived)
        }
    }

    fun calculateScore(
        weather: WeatherData,
        astro: AstroData,
        hydro: HydroData?,
        derived: DerivedWeatherFeatures
    ): ActivityScore {
        var score = 50.0
        val reasons = mutableListOf<String>()

        val wind = weather.windSpeed
        when {
            wind in 3.0..15.0 -> {
                score += 10
                reasons.add("Viento moderado favorable (${wind.toInt()} km/h)")
            }
            wind > 25 -> {
                score -= 15
                reasons.add("Viento fuerte reduce actividad")
            }
        }

        val pressureChange = derived.deltaPressure3hAvg ?: derived.deltaPressure1h ?: 0.0
        when {
            abs(pressureChange) < 0.4 -> {
                score += 6
                reasons.add("Presión estable favorece la actividad")
            }
            pressureChange < -1.2 -> {
                score -= 8
                reasons.add("Caída de presión reduce la actividad")
            }
            pressureChange > 1.2 -> {
                score -= 6
                reasons.add("Subida rápida de presión reduce la actividad")
            }
        }

        if (weather.precipitation > 2.5) {
            score -= 10
            reasons.add("Lluvia intensa reduce la actividad")
        } else if (weather.precipitation in 0.3..1.5) {
            score += 3
            reasons.add("Lluvia ligera puede activar la pesca")
        }

        val moonBoost = if (astro.moonIllumination in 40.0..80.0) 6 else 0
        if (moonBoost > 0) {
            score += moonBoost
            reasons.add("Fase lunar favorable")
        }

        if (hydro?.waterFlow != null || hydro?.waterLevel != null) {
            score += 3
            reasons.add("Condiciones hidrológicas consideradas")
        }

        score = min(100.0, max(0.0, score))

        val windows = buildBestWindows(weather.time, score)

        return ActivityScore(
            overall = score.toInt(),
            reasons = reasons.takeIf { it.isNotEmpty() } ?: listOf("Condiciones promedio"),
            bestWindows = windows
        )
    }

    private fun computeDerived(weather: List<WeatherData>, index: Int): DerivedWeatherFeatures {
        val current = weather[index]
        val prev1 = weather.getOrNull(index - 1)
        val prev3 = weather.getOrNull(index - 3)
        val deltaPressure1h = prev1?.let { current.pressure - it.pressure }
        val deltaTemp1h = prev1?.let { current.temperature - it.temperature }
        val deltaPressure3hAvg = if (prev3 != null) {
            val deltas = (index - 3..index).mapNotNull { idx ->
                val prev = weather.getOrNull(idx - 1) ?: return@mapNotNull null
                val curr = weather.getOrNull(idx) ?: return@mapNotNull null
                curr.pressure - prev.pressure
            }
            if (deltas.isNotEmpty()) deltas.sum() / deltas.size else null
        } else null

        val rainPrev6h = sumPrecip(weather, index - 6, index - 1)
        val rainSum24h = sumPrecip(weather, index - 24, index - 1)

        val windStability3h = if (index >= 2) {
            val speeds = listOf(weather[index - 2].windSpeed, weather[index - 1].windSpeed, weather[index].windSpeed)
            val avg = speeds.average()
            val variance = speeds.map { (it - avg) * (it - avg) }.average()
            val std = kotlin.math.sqrt(variance)
            max(0.0, min(1.0, 1 - std / max(1.0, avg)))
        } else null

        return DerivedWeatherFeatures(
            deltaPressure1h = deltaPressure1h,
            deltaPressure3hAvg = deltaPressure3hAvg,
            deltaTemp1h = deltaTemp1h,
            rainPrev6h = rainPrev6h,
            rainSum24h = rainSum24h,
            windStability3h = windStability3h
        )
    }

    private fun sumPrecip(weather: List<WeatherData>, from: Int, to: Int): Double? {
        if (to < 0) return null
        var sum = 0.0
        for (i in max(0, from)..min(weather.size - 1, to)) {
            sum += weather[i].precipitation
        }
        return sum
    }

    private fun buildBestWindows(time: String, score: Double): List<ActivityWindow> {
        val start = formatIsoWindow(time, 0)
        val end = formatIsoWindow(time, 2)
        return listOf(
            ActivityWindow(
                start = start,
                end = end,
                score = score.toInt(),
                reason = "Ventana destacada"
            )
        )
    }

    private fun formatIsoWindow(time: String, hoursToAdd: Long): String {
        return try {
            val instant = Instant.parse(time)
            instant.plusSeconds(hoursToAdd * 3600).toString()
        } catch (_: Exception) {
            time
        }
    }
}
