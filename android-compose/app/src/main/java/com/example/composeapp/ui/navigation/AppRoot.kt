package com.example.composeapp.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.example.composeapp.data.ForecastQuery
import com.example.composeapp.ui.screens.FavoritesScreen
import com.example.composeapp.ui.screens.ForecastScreen
import com.example.composeapp.ui.screens.HomeScreen
import com.example.composeapp.ui.screens.SettingsScreen

@Composable
fun AppRoot() {
    val navController = rememberNavController()
    val defaultForecastQuery = remember { ForecastQuery() }

    NavHost(navController = navController, startDestination = Routes.Home) {
        composable(Routes.Home) {
            HomeScreen(
                onNavigateToForecast = { query ->
                    navController.navigate(Routes.forecastRoute(query))
                },
                onNavigateToFavorites = {
                    navController.navigate(Routes.Favorites)
                },
                onNavigateToSettings = {
                    navController.navigate(Routes.Settings)
                }
            )
        }
        composable(
            route = Routes.Forecast,
            arguments = listOf(
                navArgument(Routes.Args.Species) { type = NavType.StringType; defaultValue = defaultForecastQuery.species },
                navArgument(Routes.Args.Mode) { type = NavType.StringType; defaultValue = defaultForecastQuery.mode },
                navArgument(Routes.Args.LocationName) { type = NavType.StringType; defaultValue = defaultForecastQuery.locationName },
                navArgument(Routes.Args.Latitude) { type = NavType.StringType; defaultValue = defaultForecastQuery.latitude },
                navArgument(Routes.Args.Longitude) { type = NavType.StringType; defaultValue = defaultForecastQuery.longitude }
            )
        ) { backStackEntry ->
            val args = backStackEntry.arguments
            ForecastScreen(
                query = ForecastQuery(
                    species = args?.getString(Routes.Args.Species) ?: defaultForecastQuery.species,
                    mode = args?.getString(Routes.Args.Mode) ?: defaultForecastQuery.mode,
                    locationName = args?.getString(Routes.Args.LocationName) ?: defaultForecastQuery.locationName,
                    latitude = args?.getString(Routes.Args.Latitude) ?: defaultForecastQuery.latitude,
                    longitude = args?.getString(Routes.Args.Longitude) ?: defaultForecastQuery.longitude
                ),
                onBack = { navController.popBackStack() }
            )
        }
        composable(Routes.Favorites) {
            FavoritesScreen(onBack = { navController.popBackStack() })
        }
        composable(Routes.Settings) {
            SettingsScreen(onBack = { navController.popBackStack() })
        }
    }
}
