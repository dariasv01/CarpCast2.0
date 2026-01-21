package com.example.composeapp.lib.api

import com.example.composeapp.data.AstroData
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

class AstroClient {
    companion object {
        private const val USNO_BASE = "https://aa.usno.navy.mil/api"
        private const val SUN_BASE = "https://api.sunrise-sunset.org"
        private const val FARMSENSE_BASE = "https://api.farmsense.net/v1"

        fun getAstronomicalData(latitude: Double, longitude: Double, date: LocalDate = LocalDate.now()): AstroData {
            return try {
                getUSNOData(latitude, longitude, date)
            } catch (_: Exception) {
                getFallbackData(latitude, longitude, date)
            }
        }

        private fun getUSNOData(latitude: Double, longitude: Double, date: LocalDate): AstroData {
            val dateStr = date.format(DateTimeFormatter.ISO_DATE)
            val tzOffset = ZoneId.systemDefault().rules.getOffset(date.atStartOfDay()).totalSeconds / 3600
            val params = "date=$dateStr&coords=$latitude,$longitude&tz=$tzOffset"
            val sunJson = fetchJson(URL("$USNO_BASE/rstt/oneday?$params"))
            val moonJson = fetchJson(URL("$USNO_BASE/moon/phases/date?date=$dateStr"))

            val sunData = sunJson.optJSONArray("sundata") ?: JSONArray()
            val moonData = sunJson.optJSONArray("moondata") ?: JSONArray()

            if (sunData.length() == 0) {
                return calculateFallback(latitude, longitude, date)
            }

            return AstroData(
                sunrise = parseUSNOTime(findPhenTime(sunData, "Rise")) ?: "06:00",
                sunset = parseUSNOTime(findPhenTime(sunData, "Set")) ?: "18:00",
                moonrise = parseUSNOTime(findPhenTime(moonData, "Rise")),
                moonset = parseUSNOTime(findPhenTime(moonData, "Set")),
                moonPhase = calculateMoonPhase(moonJson),
                moonIllumination = moonJson.optDouble("curphase", 50.0)
            )
        }

        private fun getFallbackData(latitude: Double, longitude: Double, date: LocalDate): AstroData {
            val dateStr = date.format(DateTimeFormatter.ISO_DATE)
            val sunJson = fetchJson(
                URL("$SUN_BASE/json?lat=$latitude&lng=$longitude&date=$dateStr&formatted=0")
            )
            val sunResults = sunJson.optJSONObject("results") ?: JSONObject()
            val moonText = fetchText(URL("$FARMSENSE_BASE/moonphases/?d=${toNoonTimestamp(date)}"))
            val moonArray = try { JSONArray(moonText) } catch (_: Exception) { JSONArray() }
            val moonFirst = moonArray.optJSONObject(0) ?: JSONObject()

            return AstroData(
                sunrise = sunResults.optString("sunrise"),
                sunset = sunResults.optString("sunset"),
                moonrise = null,
                moonset = null,
                moonPhase = moonFirst.optDouble("Phase", 0.0),
                moonIllumination = moonFirst.optDouble("Illumination", 0.0) * 100
            )
        }

        private fun calculateFallback(latitude: Double, longitude: Double, date: LocalDate): AstroData {
            val dayOfYear = date.dayOfYear
            val solarDeclination = 23.45 * kotlin.math.sin(Math.toRadians((360.0 * (284 + dayOfYear) / 365)))
            val hourAngle = kotlin.math.acos(-kotlin.math.tan(Math.toRadians(latitude)) * kotlin.math.tan(Math.toRadians(solarDeclination)))
            val sunriseHour = 12 - Math.toDegrees(hourAngle) / 15 - longitude / 15
            val sunsetHour = 12 + Math.toDegrees(hourAngle) / 15 - longitude / 15

            val sunrise = formatTime(date, sunriseHour)
            val sunset = formatTime(date, sunsetHour)

            return AstroData(
                sunrise = sunrise,
                sunset = sunset,
                moonrise = null,
                moonset = null,
                moonPhase = 0.5,
                moonIllumination = 50.0
            )
        }

        private fun formatTime(date: LocalDate, hour: Double): String {
            val h = hour.toInt().coerceIn(0, 23)
            val m = ((hour - h) * 60).toInt().coerceIn(0, 59)
            return date.atTime(h, m).atZone(ZoneId.systemDefault()).toInstant().toString()
        }

        private fun parseUSNOTime(time: String?): String? {
            if (time.isNullOrBlank()) return null
            val parts = time.split(":")
            if (parts.size < 2) return null
            val now = LocalDate.now()
            val h = parts[0].toIntOrNull() ?: return null
            val m = parts[1].toIntOrNull() ?: return null
            return now.atTime(h, m).atZone(ZoneId.systemDefault()).toInstant().toString()
        }

        private fun findPhenTime(array: JSONArray, phen: String): String? {
            for (i in 0 until array.length()) {
                val obj = array.optJSONObject(i) ?: continue
                if (obj.optString("phen") == phen) return obj.optString("time")
            }
            return null
        }

        private fun calculateMoonPhase(moonJson: JSONObject): Double {
            val phase = moonJson.optString("curphase")
            return when (phase) {
                "New Moon" -> 0.0
                "First Quarter" -> 0.25
                "Full Moon" -> 0.5
                "Last Quarter" -> 0.75
                else -> 0.0
            }
        }

        private fun toNoonTimestamp(date: LocalDate): Long {
            val noon = date.atTime(12, 0).atZone(ZoneId.systemDefault()).toInstant()
            return noon.epochSecond
        }

        private fun fetchJson(url: URL): JSONObject {
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "GET"
            connection.connectTimeout = 8000
            connection.readTimeout = 8000
            val stream = if (connection.responseCode in 200..299) {
                connection.inputStream
            } else {
                connection.errorStream ?: connection.inputStream
            }
            val text = stream.bufferedReader().readText()
            return JSONObject(text)
        }

        private fun fetchText(url: URL): String {
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "GET"
            connection.connectTimeout = 8000
            connection.readTimeout = 8000
            val stream = if (connection.responseCode in 200..299) {
                connection.inputStream
            } else {
                connection.errorStream ?: connection.inputStream
            }
            return stream.bufferedReader().readText()
        }
    }
}
