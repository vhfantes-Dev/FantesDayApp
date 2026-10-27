import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme';

// Alternância "Força geral" / "Volume da semana" entre /ranking e /ranking/semanal.
export function RankingTabs({ active }: { active: 'geral' | 'semanal' }) {
  const tabs = [
    { key: 'geral', label: 'Força geral', path: '/ranking' },
    { key: 'semanal', label: 'Volume da semana', path: '/ranking/semanal' },
  ] as const;
  return (
    <View style={styles.wrap} accessibilityRole="tablist" accessibilityLabel="Tipo de ranking">
      {tabs.map((t) => {
        const selected = t.key === active;
        return (
          <Pressable
            key={t.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => !selected && router.replace(t.path)}
            style={[styles.tab, selected && styles.tabActive]}
          >
            <Text style={[styles.text, selected && styles.textActive]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: colors.text },
  text: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSoft },
  textActive: { fontFamily: fonts.extrabold, color: colors.onAccent },
});
