package com.example.composeapp.data

import org.json.JSONArray
import java.net.URLEncoder

object ForecastRepository {
    suspend fun searchPlaces(query: String, limit: Int = 5): List<Location> {
        val encoded = URLEncoder.encode(query, Charsets.UTF_8.name())
        val response = ApiClient.getJson("/api/places/search?q=$encoded&limit=$limit")
        if (!response.optBoolean("success", false)) return emptyList()
        val results = response.optJSONObject("data")?.optJSONArray("results") ?: JSONArray()
        return (0 until results.length()).mapNotNull { index ->
            results.optJSONObject(index)?.let {
                Location(
                    name = it.optString("name"),
                    latitude = it.optDouble("latitude"),
                    longitude = it.optDouble("longitude")
                )
            }
        }
    }

    suspend fun fetchForecast(query: ForecastQuery, days: Int = 3): ForecastResult {
        val apiUrl = "/api/forecast?lat=${query.latitude}&lng=${query.longitude}" +
            "&mode=${query.mode.lowercase()}&species=${query.species.lowercase()}&days=$days"
        val response = ApiClient.getJson(apiUrl)
        if (!response.optBoolean("success", false)) {
            throw IllegalStateException(response.optString("error", "Error obteniendo pronóstico"))
        }
        val data = response.optJSONObject("data") ?: throw IllegalStateException("Respuesta inválida")
        val locationJson = data.optJSONObject("location")
        val locationName = locationJson?.optString("name") ?: query.locationName
        val location = Location(
            name = locationName,
            latitude = locationJson?.optDouble("latitude") ?: query.latitude.toDoubleOrNull() ?: 0.0,
            longitude = locationJson?.optDouble("longitude") ?: query.longitude.toDoubleOrNull() ?: 0.0
        )
        val forecasts = data.optJSONArray("forecasts") ?: JSONArray()
        val availabilityJson = data.optJSONObject("dataAvailability")
        val availability = DataAvailability(
            weather = availabilityJson?.optBoolean("weather") ?: true,
            astro = availabilityJson?.optBoolean("astro") ?: true,
            hydro = availabilityJson?.optBoolean("hydro") ?: false,
            marine = availabilityJson?.optBoolean("marine") ?: false
        )
        val entries = (0 until forecasts.length()).mapNotNull { index ->
            val item = forecasts.optJSONObject(index) ?: return@mapNotNull null
            val weather = item.optJSONObject("weather")
            val activity = item.optJSONObject("activity")
            val reasons = activity?.optJSONArray("reasons")?.toStringList() ?: emptyList()
            val windows = activity?.optJSONArray("bestWindows")?.toWindowList() ?: emptyList()
            ForecastEntry(
                timeLabel = item.optString("time"),
                activityScore = activity?.optInt("overall") ?: 0,
                temperatureC = weather?.optDouble("temperature")?.toInt() ?: 0,
                windKph = weather?.optDouble("windSpeed")?.toInt() ?: 0,
                pressureHpa = weather?.optDouble("pressure")?.toInt() ?: 0,
                reasons = reasons,
                bestWindows = windows
            )
        }

        return ForecastResult(
            location = location,
            entries = entries,
            mode = query.mode,
            species = query.species,
            dataAvailability = availability
        )
    }

    suspend fun fetchFavorites(): List<FavoriteSpot> {
        val response = ApiClient.getJson("/api/favorites")
        if (!response.optBoolean("success", false)) return emptyList()
        val results = response.optJSONArray("data") ?: JSONArray()
        return (0 until results.length()).mapNotNull { index ->
            results.optJSONObject(index)?.let { spot ->
                val locationObj = spot.optJSONObject("location")
                FavoriteSpot(
                    id = spot.optString("id"),
                    name = spot.optString("name"),
                    latitude = locationObj?.optDouble("latitude") ?: 0.0,
                    longitude = locationObj?.optDouble("longitude") ?: 0.0
                )
            }
        }
    }

    private fun JSONArray.toStringList(): List<String> {
        return (0 until length()).mapNotNull { index ->
            optString(index).takeIf { it.isNotBlank() }
        }
    }

    private fun JSONArray.toWindowList(): List<ActivityWindow> {
        return (0 until length()).mapNotNull { index ->
            optJSONObject(index)?.let { window ->
                ActivityWindow(
                    start = window.optString("start"),
                    end = window.optString("end"),
                    score = window.optInt("score"),
                    reason = window.optString("reason")
                )
            }
        }
    }
}
