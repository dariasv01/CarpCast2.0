package com.example.composeapp.ui.navigation

import com.example.composeapp.data.ForecastQuery

object Routes {
    const val Home = "home"
    const val Favorites = "favorites"
    const val Settings = "settings"

    object Args {
        const val Species = "species"
        const val Mode = "mode"
        const val LocationName = "locationName"
        const val Latitude = "lat"
        const val Longitude = "lng"
    }

    const val Forecast = "forecast?species={species}&mode={mode}&locationName={locationName}&lat={lat}&lng={lng}"

    fun forecastRoute(query: ForecastQuery): String {
        return "forecast?species=${query.species}&mode=${query.mode}&locationName=${query.locationName}&lat=${query.latitude}&lng=${query.longitude}"
    }
}
