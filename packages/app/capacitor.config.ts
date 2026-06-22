import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.renderblocks.app',
  appName: 'RenderBlocks',
  webDir: 'dist',
  android: {
    // Don't allow app to draw behind system bars
    backgroundColor: '#1e293b'
  },
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
      backgroundColor: '#1e293b'
    }
  }
};

export default config;
