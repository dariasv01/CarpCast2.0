package com.example.composeapp.data

import com.example.composeapp.lib.LocalForecastEngine
import com.example.composeapp.lib.api.GeocodingClient
import org.json.JSONArray

object ForecastRepository {
    suspend fun searchPlaces(query: String, limit: Int = 5): List<Location> {
        return kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
            GeocodingClient.searchPlaces(query, limit)
        }
    }

    suspend fun fetchForecast(query: ForecastQuery, days: Int = 3): ForecastResult {
        return kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
            LocalForecastEngine.fetchForecast(query, days)
        }
    }

    suspend fun fetchFavorites(): List<FavoriteSpot> {
        return kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
            val response = ApiClient.getJson("/api/favorites")
            if (!response.optBoolean("success", false)) return@withContext emptyList()
            val results = response.optJSONArray("data") ?: JSONArray()
            (0 until results.length()).mapNotNull { index ->
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

}
