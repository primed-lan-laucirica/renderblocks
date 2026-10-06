package com.renderblocks.app;

import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.graphics.Color;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();

        // Ensure content does not draw behind system bars (honoured before Android 15)
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

        // From Android 15 apps are always drawn edge to edge, under the status bar (and the
        // flag above is ignored), so pad the web view clear of the status bar, any camera
        // cutout and the navigation bar — or the keyboard, when it's up. Every game then
        // fits the visible screen. (Capacitor's own inset handling is off: see capacitor.config.ts.)
        View holder = (View) getBridge().getWebView().getParent();
        holder.setBackgroundColor(Color.parseColor("#1e293b"));
        ViewCompat.setOnApplyWindowInsetsListener(holder, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
            v.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
            return WindowInsetsCompat.CONSUMED;
        });
        ViewCompat.requestApplyInsets(holder);

        // Light status and navigation bar icons, on the dark strips behind them.
        WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(window, window.getDecorView());
        bars.setAppearanceLightStatusBars(false);
        bars.setAppearanceLightNavigationBars(false);
    }
}
