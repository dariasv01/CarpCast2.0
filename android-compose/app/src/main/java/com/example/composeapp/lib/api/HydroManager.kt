package com.example.composeapp.lib.api

import com.example.composeapp.data.HydroData
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt

interface HydroProvider {
    val name: String
    fun supports(lat: Double, lng: Double): Boolean
    fun fetch(lat: Double, lng: Double): HydroData?
}

class USGSHydroProvider : HydroProvider {
    override val name: String = "USGS Water Services"
    private val baseUrl = "https://waterservices.usgs.gov/nwis/iv/"

    override fun supports(lat: Double, lng: Double): Boolean {
        val inContinental = lat in 24.5..49.4 && lng in -125.0..-66.9
        val inAlaska = lat in 54.4..71.6 && lng in -179.8..-129.9
        val inHawaii = lat in 18.9..22.2 && lng in -160.3..-154.8
        return inContinental || inAlaska || inHawaii
    }

    override fun fetch(lat: Double, lng: Double): HydroData? {
        return try {
            val stations = findNearbyStations(lat, lng)
            if (stations.isEmpty()) return null
            fetchStationData(stations.first())
        } catch (_: Exception) {
            null
        }
    }

    private fun findNearbyStations(lat: Double, lng: Double): List<JSONObject> {
        val deltaLat = 0.45
        val deltaLng = 0.45 / cos(Math.toRadians(lat))
        val bbox = listOf(lng - deltaLng, lat - deltaLat, lng + deltaLng, lat + deltaLat).joinToString(",")
        val url = URL("$baseUrl?format=json&bBox=$bbox&siteStatus=active&hasDataTypeCd=iv&parameterCd=00065,00060&siteType=ST")
        val json = fetchJson(url)
        val timeSeries = json.optJSONObject("value")?.optJSONArray("timeSeries") ?: JSONArray()
        val stations = (0 until timeSeries.length()).mapNotNull { index ->
            val ts = timeSeries.optJSONObject(index) ?: return@mapNotNull null
            val source = ts.optJSONObject("sourceInfo") ?: return@mapNotNull null
            val geo = source.optJSONObject("geoLocation")?.optJSONObject("geogLocation") ?: return@mapNotNull null
            val latVal = geo.optDouble("latitude")
            val lngVal = geo.optDouble("longitude")
            if (!latVal.isFinite() || !lngVal.isFinite()) return@mapNotNull null
            val siteCode = source.optJSONArray("siteCode")?.optJSONObject(0)?.optString("value") ?: return@mapNotNull null
            val parameterCode = ts.optJSONObject("variable")?.optJSONArray("variableCode")?.optJSONObject(0)?.optString("value")
                ?: return@mapNotNull null
            JSONObject()
                .put("siteCode", siteCode)
                .put("parameterCode", parameterCode)
                .put("latitude", latVal)
                .put("longitude", lngVal)
        }.sortedBy { station ->
            calculateDistance(lat, lng, station.getDouble("latitude"), station.getDouble("longitude"))
        }
        return stations
    }

    private fun fetchStationData(station: JSONObject): HydroData {
        val siteCode = station.getString("siteCode")
        val parameter = station.getString("parameterCode")
        val url = URL("$baseUrl?format=json&sites=$siteCode&parameterCd=$parameter&period=P7D")
        val json = fetchJson(url)
        val timeSeries = json.optJSONObject("value")?.optJSONArray("timeSeries")?.optJSONObject(0)
        val values = timeSeries?.optJSONArray("values")?.optJSONObject(0)?.optJSONArray("value") ?: JSONArray()
        val series = (0 until values.length()).mapNotNull { index ->
            val obj = values.optJSONObject(index) ?: return@mapNotNull null
            val value = obj.optString("value").toDoubleOrNull() ?: return@mapNotNull null
            val date = obj.optString("dateTime")
            JSONObject().put("value", value).put("dateTime", date)
        }
        if (series.isEmpty()) throw IllegalStateException("No recent values")
        val current = series.last().getDouble("value")
        val isDischarge = parameter == "00060"
        return HydroData(
            waterLevel = if (isDischarge) null else current,
            waterFlow = if (isDischarge) current else null,
            provider = name,
            lastUpdate = series.last().optString("dateTime")
        )
    }

    private fun calculateDistance(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
        val r = 6371.0
        val dLat = Math.toRadians(lat2 - lat1)
        val dLng = Math.toRadians(lng2 - lng1)
        val a = sin(dLat / 2).pow(2.0) + cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) * sin(dLng / 2).pow(2.0)
        val c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return r * c
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
        val text = stream.bufferedReader().readText()
        return JSONObject(text)
    }
}

class OpenMeteoFloodHydroProvider : HydroProvider {
    override val name: String = "Open-Meteo Flood API"
    private val baseUrl = "https://flood-api.open-meteo.com/v1/flood"

    override fun supports(lat: Double, lng: Double): Boolean = true

    override fun fetch(lat: Double, lng: Double): HydroData? {
        return try {
            val url = URL("$baseUrl?latitude=$lat&longitude=$lng&daily=river_discharge&forecast_days=30&cell_selection=land")
            val json = fetchJson(url)
            val daily = json.optJSONObject("daily") ?: return null
            val times = daily.optJSONArray("time") ?: return null
            val discharge = daily.optJSONArray("river_discharge") ?: return null
            if (times.length() == 0) return null
            val todayKey = java.time.LocalDate.now().toString()
            var idx = (0 until times.length()).firstOrNull { times.optString(it) == todayKey } ?: 0
            if (idx !in 0 until discharge.length()) idx = 0
            val value = discharge.optDouble(idx)
            if (!value.isFinite()) return null
            HydroData(
                waterLevel = null,
                waterFlow = value,
                provider = name,
                lastUpdate = java.time.Instant.now().toString()
            )
        } catch (_: Exception) {
            null
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
        val text = stream.bufferedReader().readText()
        return JSONObject(text)
    }
}

object HydroManager {
    private val providers: List<HydroProvider> = listOf(
        USGSHydroProvider(),
        OpenMeteoFloodHydroProvider()
    )

    fun getHydroData(lat: Double, lng: Double): HydroData? {
        val provider = providers.firstOrNull { it.supports(lat, lng) } ?: return null
        return provider.fetch(lat, lng)
    }

    fun supports(lat: Double, lng: Double): Boolean = providers.any { it.supports(lat, lng) }
}
