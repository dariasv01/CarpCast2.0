package com.example.composeapp.lib.api

import com.example.composeapp.data.MarineData
import com.example.composeapp.data.WeatherData
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class OpenMeteoClient {
    companion object {
        private const val BASE = "https://api.open-meteo.com/v1"
        private var lastRequest = 0L
        private const val MIN_INTERVAL_MS = 1000L

        private fun waitForRateLimit() {
            val now = System.currentTimeMillis()
            val since = now - lastRequest
            if (since < MIN_INTERVAL_MS) {
                Thread.sleep(MIN_INTERVAL_MS - since)
            }
            lastRequest = System.currentTimeMillis()
        }

        fun getForecast(latitude: Double, longitude: Double, days: Int = 7): List<WeatherData> {
            waitForRateLimit()
            val hourly = listOf(
                "temperature_2m",
                "relative_humidity_2m",
                "dewpoint_2m",
                "precipitation",
                "precipitation_probability",
                "cloud_cover",
                "wind_speed_10m",
                "wind_direction_10m",
                "wind_gusts_10m",
                "surface_pressure",
                "shortwave_radiation",
                "is_day",
                "visibility",
                "uv_index"
            ).joinToString(",")

            val url = URL(
                "$BASE/forecast?latitude=$latitude&longitude=$longitude&hourly=$hourly&timezone=auto&forecast_days=$days"
            )
            val json = fetchJson(url)
            val hourlyJson = json.optJSONObject("hourly") ?: return emptyList()
            val times = hourlyJson.optJSONArray("time") ?: return emptyList()

            return (0 until times.length()).map { index ->
                WeatherData(
                    time = times.optString(index),
                    temperature = hourlyJson.optJSONArray("temperature_2m")?.optDouble(index) ?: 0.0,
                    windSpeed = hourlyJson.optJSONArray("wind_speed_10m")?.optDouble(index) ?: 0.0,
                    windDirection = hourlyJson.optJSONArray("wind_direction_10m")?.optDouble(index) ?: 0.0,
                    cloudCover = hourlyJson.optJSONArray("cloud_cover")?.optDouble(index) ?: 0.0,
                    precipitation = hourlyJson.optJSONArray("precipitation")?.optDouble(index) ?: 0.0,
                    humidity = hourlyJson.optJSONArray("relative_humidity_2m")?.optDouble(index) ?: 0.0,
                    pressure = hourlyJson.optJSONArray("surface_pressure")?.optDouble(index) ?: 1013.25,
                    visibility = hourlyJson.optJSONArray("visibility")?.optDouble(index) ?: 10000.0,
                    uvIndex = hourlyJson.optJSONArray("uv_index")?.optDouble(index) ?: 0.0,
                    gustSpeed = hourlyJson.optJSONArray("wind_gusts_10m")?.optDouble(index) ?: 0.0,
                    dewPoint = hourlyJson.optJSONArray("dewpoint_2m")?.optDouble(index),
                    isDay = hourlyJson.optJSONArray("is_day")?.optInt(index)?.let { it == 1 }
                )
            }
        }

        fun getMarineData(latitude: Double, longitude: Double, days: Int = 7): List<MarineData> {
            waitForRateLimit()
            val hourly = listOf(
                "wave_height",
                "wave_direction",
                "wave_period",
                "wind_wave_height",
                "swell_wave_height",
                "swell_wave_period",
                "swell_wave_direction"
            ).joinToString(",")

            val url = URL(
                "$BASE/marine?latitude=$latitude&longitude=$longitude&hourly=$hourly&timezone=auto&forecast_days=$days"
            )
            return try {
                val json = fetchJson(url)
                val hourlyJson = json.optJSONObject("hourly") ?: return emptyList()
                val times = hourlyJson.optJSONArray("time") ?: return emptyList()
                (0 until times.length()).map { index ->
                    MarineData(
                        time = times.optString(index),
                        waveHeight = hourlyJson.optJSONArray("wave_height")?.optDouble(index) ?: 0.0,
                        waveDirection = hourlyJson.optJSONArray("wave_direction")?.optDouble(index),
                        wavePeriod = hourlyJson.optJSONArray("wave_period")?.optDouble(index),
                        swellHeight = hourlyJson.optJSONArray("swell_wave_height")?.optDouble(index),
                        swellPeriod = hourlyJson.optJSONArray("swell_wave_period")?.optDouble(index),
                        swellDirection = hourlyJson.optJSONArray("swell_wave_direction")?.optDouble(index)
                    )
                }
            } catch (_: Exception) {
                emptyList()
            }
        }

        private fun fetchJson(url: URL): JSONObject {
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "GET"
            connection.connectTimeout = 10000
            connection.readTimeout = 10000
            val stream = if (connection.responseCode in 200..299) {
                connection.inputStream
            } else {
                connection.errorStream ?: connection.inputStream
            }
            val response = stream.bufferedReader().readText()
            return JSONObject(response)
        }
    }
}
