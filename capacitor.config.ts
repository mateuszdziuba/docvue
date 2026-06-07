import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'pl.docvue.app',
  appName: 'docvue',
  // DEV: local livereload — switch back to vercel URL before committing
  server: {
    url: 'http://192.168.1.168:3000',
    cleartext: true,
  },
  ios: {
    contentInset: 'always',
    // Allows WKWebView to read cookies from the server session
    limitsNavigationsToAppBoundDomains: true,
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
  },
  plugins: {
    // Will be configured when adding @capacitor/push-notifications
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
}

export default config
