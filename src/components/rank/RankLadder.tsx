import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { StrengthRank } from '@/api/types';
import { RankBadge } from '@/components/ui';
import { colors, fonts } from '@/theme';
import { RANK_ORDER, RANKS } from '@/utils/ranks';

const SHORT: Partial<Record<StrengthRank, string>> = { GRANDMASTER: 'G.-Mestre' };

// Escada com os 9 selos; o atual em destaque. Toque abre /rank/selos.
export function RankLadder({ current }: { current: StrengthRank | null }) {
  const idx = current ? RANK_ORDER.indexOf(current) : -1;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Escada de ranks — ver todos"
      onPress={() => router.push('/rank/selos')}
      style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.85 }]}
    >
      {RANK_ORDER.map((r, i) => {
        const isCurrent = i === idx;
        return (
          <View key={r} style={[styles.item, { opacity: isCurrent ? 1 : i < idx ? 0.6 : 0.35 }]}>
            <RankBadge rank={r} size={isCurrent ? 38 : 26} />
            <Text
              numberOfLines={1}
              style={[styles.label, isCurrent && { color: RANKS[r].color, fontFamily: fonts.extrabold }]}
            >
              {SHORT[r] ?? RANKS[r].label}
            </Text>
          </View>
        );
      })}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  item: { alignItems: 'center', gap: 4, flex: 1 },
  label: { fontFamily: fonts.bold, fontSize: 8, color: colors.textMuted },
});
