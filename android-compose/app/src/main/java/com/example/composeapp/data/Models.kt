package com.example.composeapp.data

enum class FishSpecies(val label: String, val mode: FishingMode) {
    Carp("Carpa", FishingMode.CarpFishing),
    Barbel("Barbo", FishingMode.CarpFishing),
    Bass("BlackBass", FishingMode.Predator),
    Pike("Lucio", FishingMode.Predator),
    Catfish("Siluro", FishingMode.Predator)
}

enum class FishingMode(val label: String) {
    CarpFishing("Carpfishing"),
    Predator("Depredadores")
}

data class Location(
    val name: String,
    val latitude: Double,
    val longitude: Double
)

data class ForecastQuery(
    val species: String = FishSpecies.Carp.name,
    val mode: String = FishingMode.CarpFishing.name,
    val locationName: String = "Madrid, España",
    val latitude: String = "40.4168",
    val longitude: String = "-3.7038"
)

data class ForecastEntry(
    val timeLabel: String,
    val activityScore: Int,
    val temperatureC: Int,
    val windKph: Int,
    val pressureHpa: Int
)

data class DayForecast(
    val dayLabel: String,
    val entries: List<ForecastEntry>
)

data class FeatureCard(
    val title: String,
    val subtitle: String
)

data class QuickAction(
    val title: String,
    val subtitle: String
)
