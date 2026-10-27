import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Keychain/Keystore no celular; no navegador (expo web) cai para o AsyncStorage.
const isWeb = Platform.OS === 'web';

export const secureStorage = {
  async get(key: string) {
    return isWeb ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string) {
    if (isWeb) await AsyncStorage.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string) {
    if (isWeb) await AsyncStorage.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  },
};

export const KEYS = {
  refreshToken: 'fantesday.refreshToken',
  biometric: 'fantesday.biometric',
} as const;
