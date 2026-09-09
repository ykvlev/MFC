package local.university.edinoeokno.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import local.university.edinoeokno.designsystem.Brand
import local.university.edinoeokno.designsystem.SkeletonList
import local.university.edinoeokno.feature.applications.ApplicationDetailScreen
import local.university.edinoeokno.feature.applications.ApplicationsListScreen
import local.university.edinoeokno.feature.auth.AuthViewModel
import local.university.edinoeokno.feature.auth.LoginScreen
import local.university.edinoeokno.feature.catalog.CatalogScreen
import local.university.edinoeokno.feature.catalog.NewApplicationScreen
import local.university.edinoeokno.feature.cells.CellsScreen
import local.university.edinoeokno.feature.notifications.NotificationsScreen
import local.university.edinoeokno.feature.profile.ProfileScreen
import local.university.edinoeokno.feature.registry.RegistryScreen
import local.university.edinoeokno.feature.slots.SlotsScreen

@Composable
fun OknoApp(authViewModel: AuthViewModel = hiltViewModel()) {
    val state by authViewModel.state.collectAsState()

    when {
        state.booting -> Box(
            Modifier.fillMaxSize().background(Brand.White).safeDrawingPadding().padding(20.dp),
            contentAlignment = Alignment.Center,
        ) { SkeletonList(rows = 3) }

        state.user == null -> LoginScreen(state, authViewModel::login)

        else -> {
            val role = state.user!!.role
            val navController = rememberNavController()
            val tabs = tabsFor(role)
            val backStack by navController.currentBackStackEntryAsState()
            val currentRoute = backStack?.destination

            Scaffold(
                containerColor = Brand.White,
                bottomBar = {
                    NavigationBar(containerColor = Brand.White, tonalElevation = 0.dp) {
                        tabs.forEach { tab ->
                            val selected = currentRoute?.hierarchy?.any { it.route == tab.route } == true
                            NavigationBarItem(
                                selected = selected,
                                onClick = {
                                    navController.navigate(tab.route) {
                                        popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                },
                                icon = {
                                    Box(
                                        Modifier
                                            .width(22.dp)
                                            .height(3.dp)
                                            .background(if (selected) Brand.Blue else Brand.White)
                                    )
                                },
                                label = { Text(tab.label, style = MaterialTheme.typography.labelSmall) },
                                colors = NavigationBarItemDefaults.colors(
                                    selectedTextColor = Brand.Black,
                                    unselectedTextColor = Brand.TextDim,
                                    indicatorColor = Brand.White,
                                ),
                            )
                        }
                    }
                },
            ) { padding ->
                NavHost(
                    navController = navController,
                    startDestination = tabs.first().route,
                    modifier = Modifier.padding(padding),
                ) {
                    composable(Routes.MyApplications) {
                        ApplicationsListScreen(scope = "my") { navController.navigate(Routes.detail(it)) }
                    }
                    composable(Routes.Queue) {
                        ApplicationsListScreen(scope = "queue") { navController.navigate(Routes.detail(it)) }
                    }
                    composable(Routes.Catalog) {
                        CatalogScreen { typeId -> navController.navigate(Routes.newApplication(typeId)) }
                    }
                    composable(Routes.NewApplication) { entry ->
                        val typeId = entry.arguments?.getString("typeId").orEmpty()
                        NewApplicationScreen(
                            typeId = typeId,
                            onBack = { navController.popBackStack() },
                            onSubmitted = { id ->
                                navController.navigate(Routes.detail(id)) {
                                    popUpTo(Routes.Catalog)
                                }
                            },
                        )
                    }
                    composable(Routes.Cells) { CellsScreen() }
                    composable(Routes.Registry) { RegistryScreen() }
                    composable(Routes.Slots) { SlotsScreen() }
                    composable(Routes.Notifications) {
                        NotificationsScreen { navController.navigate(Routes.detail(it)) }
                    }
                    composable(Routes.Profile) {
                        ProfileScreen(state.user!!, onLogout = authViewModel::logout)
                    }
                    composable(Routes.Detail) { entry ->
                        val id = entry.arguments?.getString("id").orEmpty()
                        ApplicationDetailScreen(
                            applicationId = id,
                            role = role,
                            department = state.user?.department,
                            onBack = { navController.popBackStack() },
                        )
                    }
                }
            }
        }
    }
}
