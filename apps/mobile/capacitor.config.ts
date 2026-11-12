import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Placeholder bundle id; change before the first store submission (it cannot change afterwards).
  appId: 'app.wengua.meihua',
  appName: '三清问道',
  webDir: 'dist',
  backgroundColor: '#14100c',
  ios: { contentInset: 'never' },
  android: { allowMixedContent: false },
};

export default config;
