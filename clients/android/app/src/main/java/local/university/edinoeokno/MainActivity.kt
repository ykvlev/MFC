package local.university.edinoeokno

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import dagger.hilt.android.AndroidEntryPoint
import local.university.edinoeokno.designsystem.EdinoeOknoTheme
import local.university.edinoeokno.navigation.OknoApp

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            EdinoeOknoTheme { OknoApp() }
        }
    }
}
