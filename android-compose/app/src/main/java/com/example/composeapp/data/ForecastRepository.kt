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
        val entries = (0 until forecasts.length()).mapNotNull { index ->
            val item = forecasts.optJSONObject(index) ?: return@mapNotNull null
            val weather = item.optJSONObject("weather")
            val activity = item.optJSONObject("activity")
            ForecastEntry(
                timeLabel = item.optString("time"),
                activityScore = activity?.optInt("overall") ?: 0,
                temperatureC = weather?.optDouble("temperature")?.toInt() ?: 0,
                windKph = weather?.optDouble("windSpeed")?.toInt() ?: 0,
                pressureHpa = weather?.optDouble("pressure")?.toInt() ?: 0
            )
        }

        return ForecastResult(location = location, entries = entries, mode = query.mode, species = query.species)
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
}
