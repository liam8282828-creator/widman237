import React, { useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Platform, StatusBar, ActivityIndicator } from 'react-native';
import loginHtml from '@/constants/loginHtml';
import appHtml from '@/constants/appHtml';

// react-native-webview is a native module — only available in EAS builds (not web preview).
// We lazy-import so the web bundler doesn't break.
let WebView: any;
let WebViewNative = false;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  WebView = require('react-native-webview').WebView;
  WebViewNative = true;
} catch {
  WebView = null;
}

const TRIAL_KEY = 'WIDMAN-TRIAL-2026';

function isValidKey(key: string): boolean {
  if (!key || key.length < 4) return false;
  if (key === TRIAL_KEY) return true;
  if (key.length > 10) return true;
  return false;
}

/** Web fallback: render the app HTML in a plain iframe (web preview only) */
function WebFallback({ html }: { html: string }) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  return (
    <iframe
      title="Widman iOS"
      src={url}
      style={{ flex: 1, width: '100%', height: '100%', border: 'none', background: '#0d0d14' } as any}
    />
  );
}

export default function HomeScreen() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef<any>(null);

  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent?.data ?? event.data ?? '{}');
      if (data.event === 'authenticated') {
        if (isValidKey(data.key || '')) {
          setAuthenticated(true);
          setLoading(true);
        }
      } else if (data.event === 'logout') {
        setAuthenticated(false);
        setLoading(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const currentHtml = authenticated ? appHtml : loginHtml;

  // ── Web preview fallback (iframe) ──────────────────────────────────────
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <WebFallback html={currentHtml} />
      </View>
    );
  }

  // ── Native: use react-native-webview ───────────────────────────────────
  if (!WebViewNative || !WebView) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#6c47ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d14" translucent={false} />
      <WebView
        ref={webViewRef}
        source={{ html: currentHtml, baseUrl: 'https://widman.local' }}
        style={styles.webview}
        onMessage={handleMessage}
        onNavigationStateChange={(navState: any) => {
          if (navState.url?.includes('/Home/Login')) setAuthenticated(false);
        }}
        onLoad={() => setLoading(false)}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        allowUniversalAccessFromFileURLs
        mixedContentMode="always"
        originWhitelist={['*']}
        scalesPageToFit={false}
        setSupportMultipleWindows={false}
      />
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#6c47ff" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d14',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  },
  webview: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  loader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0d0d14',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
