package com.example.composeapp.lib

import com.example.composeapp.data.ActivityScore
import com.example.composeapp.data.DataAvailability
import com.example.composeapp.data.ForecastEntry
import com.example.composeapp.data.ForecastQuery
import com.example.composeapp.data.ForecastResult
import com.example.composeapp.data.Location
import com.example.composeapp.data.WeatherData
import com.example.composeapp.lib.api.AstroClient
import com.example.composeapp.lib.api.HydroManager
import com.example.composeapp.lib.api.OpenMeteoClient
import com.example.composeapp.lib.scoring.ActivityScoring
import java.time.LocalDate

object LocalForecastEngine {
    fun fetchForecast(query: ForecastQuery, days: Int = 3): ForecastResult {
        val lat = query.latitude.toDoubleOrNull() ?: 0.0
        val lng = query.longitude.toDoubleOrNull() ?: 0.0
        val weather = OpenMeteoClient.getForecast(lat, lng, days)
        val astro = AstroClient.getAstronomicalData(lat, lng, LocalDate.now())
        val hydro = HydroManager.getHydroData(lat, lng)
        val scores = ActivityScoring.calculateSeries(weather, astro, hydro)

        val entries = weather.mapIndexed { index, w ->
            val score = scores.getOrNull(index) ?: ActivityScore(0, listOf("Sin datos"), emptyList())
            ForecastEntry(
                timeLabel = w.time,
                activityScore = score.overall,
                temperatureC = w.temperature.toInt(),
                windKph = w.windSpeed.toInt(),
                pressureHpa = w.pressure.toInt(),
                reasons = score.reasons,
                bestWindows = score.bestWindows
            )
        }

        return ForecastResult(
            location = Location(query.locationName, lat, lng),
            entries = entries,
            mode = query.mode,
            species = query.species,
            dataAvailability = DataAvailability(
                weather = true,
                astro = true,
                hydro = hydro != null,
                marine = false
            )
        )
    }
}
