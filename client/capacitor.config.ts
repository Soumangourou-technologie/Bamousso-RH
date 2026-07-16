import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.soumangourou.bamoussorh',
  appName: 'BamoussoRH',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    CapacitorCookies: {
      enabled: true,
    },
    SplashScreen: {
      backgroundColor: '#1a0f0a',
      launchAutoHide: true,
      launchShowDuration: 1000,
    }
  }
};

export default config;
