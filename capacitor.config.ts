import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ridex.app',
  appName: 'RideConnect',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Change this to your deployed backend URL once it's live on Render
    // url: 'https://your-ridex-backend.onrender.com',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },
};

export default config;
