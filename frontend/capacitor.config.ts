import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jayun.harulog',
  appName: 'HaruLog',
  webDir: 'out',
  server: {
    url: 'https://haru-log.vercel.app',
    cleartext: true,
    androidScheme: 'https'
  }
};

export default config;
