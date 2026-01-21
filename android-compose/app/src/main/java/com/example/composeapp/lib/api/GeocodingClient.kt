package com.example.composeapp.lib.api

import com.example.composeapp.data.Location
import org.json.JSONArray
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

class GeocodingClient {
    companion object {
        private const val BASE = "https://nominatim.openstreetmap.org"

        fun searchPlaces(query: String, limit: Int = 5): List<Location> {
            val encoded = URLEncoder.encode(query, Charsets.UTF_8.name())
            val url = URL("$BASE/search?q=$encoded&format=json&limit=$limit")
            val response = fetch(url)
            val results = JSONArray(response)
            return (0 until results.length()).mapNotNull { index ->
                results.optJSONObject(index)?.let { item ->
                    Location(
                        name = item.optString("display_name"),
                        latitude = item.optString("lat").toDoubleOrNull() ?: return@let null,
                        longitude = item.optString("lon").toDoubleOrNull() ?: return@let null
                    )
                }
            }
        }

        private fun fetch(url: URL): String {
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "GET"
            connection.setRequestProperty("User-Agent", "CarpCastAndroid/1.0")
            connection.connectTimeout = 10000
            connection.readTimeout = 10000
            val stream = if (connection.responseCode in 200..299) {
                connection.inputStream
            } else {
                connection.errorStream ?: connection.inputStream
            }
            return stream.bufferedReader().readText()
        }
    }
}
