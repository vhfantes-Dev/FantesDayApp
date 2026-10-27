import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { foodApi } from '@/api/endpoints';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { Button, T } from '@/components/ui';
import { colors, fonts, radius } from '@/theme';

const IS_WEB = Platform.OS === 'web';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/nutricao');
}

export default function ScannerScreen() {
  const { mealId } = useLocalSearchParams<{ mealId?: string }>();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const locked = useRef(false);

  async function lookup(raw: string) {
    const value = raw.replace(/\D/g, '');
    if (value.length < 8 || value.length > 14) {
      setFieldError('Digite um código de barras com 8 a 14 números.');
      locked.current = false;
      return;
    }
    locked.current = true;
    setBusy(true);
    setNotFound(null);
    setFieldError(null);
    try {
      const food = await foodApi.barcode(value);
      router.replace({ pathname: '/alimentos/[id]', params: { id: String(food.id), ...(mealId ? { mealId } : {}) } });
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setNotFound(value);
        setCode(value);
      } else {
        toast.error(e instanceof Error ? e.message : 'Não foi possível buscar o produto.');
      }
      setBusy(false);
      // Deixa a câmera ler de novo depois de um instante.
      setTimeout(() => {
        locked.current = false;
      }, 1500);
    }
  }

  function onScanned(result: BarcodeScanningResult) {
    if (locked.current || busy) return;
    locked.current = true;
    void lookup(result.data);
  }

  const granted = !!permission?.granted;
  const showCamera = !IS_WEB && granted;

  return (
    <View style={styles.screen}>
      {showCamera ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
          onBarcodeScanned={busy ? undefined : onScanned}
        />
      ) : null}

      <View style={[styles.header, { top: insets.top + 12 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={close} style={styles.roundBtn}>
          <Icon name="close" size={18} color={colors.text} strokeWidth={2} />
        </Pressable>
        {showCamera ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={torch ? 'Desligar lanterna' : 'Ligar lanterna'}
            accessibilityState={{ selected: torch }}
            onPress={() => setTorch((t) => !t)}
            style={[styles.roundBtn, torch && { backgroundColor: colors.accent, borderColor: colors.accent }]}
          >
            <Icon name="bolt" size={18} color={torch ? colors.onAccent : colors.text} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.middle} pointerEvents="box-none">
        {showCamera ? (
          <>
            <View style={styles.frame} pointerEvents="none">
              <View style={[styles.corner, styles.tl]} />
              <View style={[styles.corner, styles.tr]} />
              <View style={[styles.corner, styles.bl]} />
              <View style={[styles.corner, styles.br]} />
              <View style={styles.laser} />
              {busy ? (
                <View style={styles.busy}>
                  <ActivityIndicator color={colors.accent} size="large" />
                </View>
              ) : null}
            </View>
            <Text style={styles.hint}>{busy ? 'Buscando produto…' : 'Aponte para o código de barras'}</Text>
          </>
        ) : IS_WEB ? (
          <View style={styles.message}>
            <Icon name="barcode" size={40} color={colors.textMuted} />
            <Text style={styles.messageTitle}>Leitura pela câmera indisponível</Text>
            <T variant="caption" style={styles.center}>No navegador, digite o código de barras abaixo.</T>
          </View>
        ) : !permission ? (
          <ActivityIndicator color={colors.accent} size="large" />
        ) : (
          <View style={styles.message}>
            <Icon name="camera" size={40} color={colors.textMuted} />
            <Text style={styles.messageTitle}>Precisamos da câmera</Text>
            <T variant="caption" style={styles.center}>
              Permita o acesso à câmera para ler códigos de barras, ou digite o código abaixo.
            </T>
            {permission.canAskAgain ? (
              <Button title="Permitir câmera" small onPress={() => void requestPermission()} style={{ marginTop: 6 }} />
            ) : (
              <Button title="Abrir ajustes" variant="secondary" small onPress={() => void Linking.openSettings()} style={{ marginTop: 6 }} />
            )}
          </View>
        )}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
          {notFound ? (
            <View style={styles.notFound} accessibilityRole="alert">
              <Icon name="alert" size={20} color={colors.carbs} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.notFoundTitle}>Produto não encontrado</Text>
                <T variant="caption">O código {notFound} não está no catálogo nem no Open Food Facts. Confira os números ou cadastre o alimento.</T>
              </View>
            </View>
          ) : null}
          <Text style={styles.label}>Ou digite o código</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput
              value={code}
              onChangeText={(t) => {
                setCode(t.replace(/\D/g, ''));
                setFieldError(null);
              }}
              placeholder="7891000000000"
              placeholderTextColor={colors.textDone}
              selectionColor={colors.accent}
              keyboardType="number-pad"
              maxLength={14}
              returnKeyType="search"
              onSubmitEditing={() => void lookup(code)}
              accessibilityLabel="Código de barras"
              style={[styles.input, !!fieldError && { borderColor: colors.danger }]}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => void lookup(code)}
              disabled={busy}
              style={({ pressed }) => [styles.searchBtn, (pressed || busy) && { opacity: 0.8 }]}
            >
              {busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.searchText}>Buscar</Text>}
            </Pressable>
          </View>
          {fieldError ? <T variant="caption" color={colors.danger} style={{ fontFamily: fonts.semibold }}>{fieldError}</T> : null}
          {notFound ? (
            <Button
              title="Cadastrar alimento"
              variant="secondary"
              icon="plus"
              small
              onPress={() => router.replace({ pathname: '/alimentos/novo', params: mealId ? { mealId } : {} })}
            />
          ) : (
            <T variant="caption">Se o produto não estiver no catálogo, importamos do Open Food Facts.</T>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const CORNER = 40;
const BORDER = 4;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#111418' },
  header: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', zIndex: 2 },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.icon,
    backgroundColor: 'rgba(10,12,15,0.8)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28, paddingHorizontal: 32, paddingBottom: 40 },
  frame: { width: 300, height: 190, maxWidth: '100%' },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: colors.accent },
  tl: { top: 0, left: 0, borderTopWidth: BORDER, borderLeftWidth: BORDER, borderTopLeftRadius: 16 },
  tr: { top: 0, right: 0, borderTopWidth: BORDER, borderRightWidth: BORDER, borderTopRightRadius: 16 },
  bl: { bottom: 0, left: 0, borderBottomWidth: BORDER, borderLeftWidth: BORDER, borderBottomLeftRadius: 16 },
  br: { bottom: 0, right: 0, borderBottomWidth: BORDER, borderRightWidth: BORDER, borderBottomRightRadius: 16 },
  laser: {
    position: 'absolute',
    top: 94,
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  busy: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  hint: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textSoft, textAlign: 'center' },
  message: { alignItems: 'center', gap: 10, maxWidth: 300 },
  messageTitle: { fontFamily: fonts.title, fontSize: 16, color: colors.text, textAlign: 'center' },
  center: { textAlign: 'center', fontSize: 13, lineHeight: 20 },
  sheetWrap: { width: '100%' },
  sheet: {
    paddingTop: 22,
    paddingHorizontal: 20,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textLabel },
  input: {
    flex: 1,
    minWidth: 0,
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.surface2,
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 15,
    letterSpacing: 0.9,
  },
  searchBtn: { height: 52, paddingHorizontal: 20, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  searchText: { fontFamily: fonts.extrabold, fontSize: 15, color: colors.onAccent },
  notFound: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.carbsSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notFoundTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
});
