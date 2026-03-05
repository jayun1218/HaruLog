import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jayun.harulog',
  appName: 'HaruLog',
  webDir: 'out',
  server: {
    url: 'http://192.168.0.30:3000',
    cleartext: true,
    androidScheme: 'https'
  }
};

export default config;
