/**
 * MeshConnect — App root with NFC TechPass Deep Linking.
 *
 * Wraps application in React Navigation's NavigationContainer with:
 * - Universal link prefix matching (https://techies.app and techies://)
 * - Dynamic route mapping to Profile screen (p/:deviceId)
 * - NFC Deep Link handler listener initialization
 */
import React, { useEffect, useRef } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { NFCDeepLinkHandler } from './src/services/nfc';
import { RootStackParamList } from './src/navigation/types';

const linking = {
  prefixes: ['https://techies.app', 'techies://'],
  config: {
    screens: {
      Home: '',
      MyProfile: 'my-profile',
      Profile: 'p/:deviceId',
    },
  },
};

const App: React.FC = () => {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();

  useEffect(() => {
    // Set navigation reference in NFC Deep Link Handler
    NFCDeepLinkHandler.setNavigationCallback((screen, params) => {
      if (navigationRef.isReady()) {
        navigationRef.navigate(screen as any, params);
      }
    });

    // Start listening for NFC tag intents and deep links
    const cleanup = NFCDeepLinkHandler.init();
    return () => {
      cleanup();
    };
  }, [navigationRef]);

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <AppNavigator />
    </NavigationContainer>
  );
};

export default App;
