import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Placeholder bundle id; change before the first store submission (it cannot change afterwards).
  appId: 'app.wengua.meihua',
  appName: '问卦',
  webDir: 'dist',
  backgroundColor: '#14100c',
  ios: { contentInset: 'never' },
  android: { allowMixedContent: false },
  // Sign in with Apple and Google only; Facebook and X are not bundled (smaller app, no ad-ID SDK).
  plugins: { SocialLogin: { providers: { google: true, apple: true, facebook: false, twitter: false } } },
};

export default config;
