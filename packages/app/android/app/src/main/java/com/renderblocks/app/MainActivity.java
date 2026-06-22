package com.renderblocks.app;

import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;
import android.graphics.Color;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();

        // Ensure content does not draw behind system bars
        WindowCompat.setDecorFitsSystemWindows(window, true);

        // Force navigation bar to be opaque and visible
        window.setNavigationBarColor(Color.WHITE);
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);
        window.clearFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS);

        // Apply again after a delay to override any Capacitor initialization
        window.getDecorView().post(() -> {
            WindowCompat.setDecorFitsSystemWindows(window, true);
            window.setNavigationBarColor(Color.WHITE);
        });
    }
}
