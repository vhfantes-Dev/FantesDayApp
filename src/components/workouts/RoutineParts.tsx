// Cartões e linhas das telas de rotinas (Rotinas.dc / RotinaDetalhe.dc).
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Routine, RoutineExercise } from '@/api/types';
import { T } from '@/components/ui';
import { colors, fonts, radius } from '@/theme';
import { ExerciseThumb } from './parts';
import type { RoutineMeta } from './routines';

export function RoutineCard({
  routine,
  meta,
  isNext,
  onPress,
  showExercises,
}: {
  routine: Routine;
  meta: RoutineMeta;
  isNext?: boolean;
  onPress: () => void;
  showExercises?: boolean;
}) {
  const names = routine.exercises.map((e) => e.exerciseName);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [st.card, pressed && { opacity: 0.85 }]}>
      <View style={st.cardHead}>
        <View style={[st.letter, isNext && { backgroundColor: colors.accent }]}>
          <Text style={[st.letterText, isNext && { color: colors.onAccent }]}>{meta.letter}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={st.title} numberOfLines={1}>{meta.title}</Text>
          {meta.subtitle ? <T variant="caption" numberOfLines={1}>{meta.subtitle}</T> : null}
        </View>
        {isNext ? (
          <View style={st.nextTag}>
            <Text style={st.nextTagText}>Próximo</Text>
          </View>
        ) : null}
      </View>
      <View style={st.stats}>
        <Text style={st.stat}>{meta.exercises} {meta.exercises === 1 ? 'exercício' : 'exercícios'}</Text>
        <Text style={st.stat}>{meta.sets} séries</Text>
        {meta.exercises ? <Text style={st.stat}>~{meta.minutes} min</Text> : null}
      </View>
      {showExercises && names.length ? (
        <View style={st.chips}>
          {names.slice(0, 2).map((n, i) => (
            <View key={i} style={st.chip}>
              <Text style={st.chipText} numberOfLines={1}>{n}</Text>
            </View>
          ))}
          {names.length > 2 ? (
            <View style={st.chip}>
              <Text style={st.chipText}>+{names.length - 2}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

// Linha numerada de exercício da rotina (número, imagem, nome, músculo, séries × reps e descanso).
export function RoutineExerciseRow({
  item,
  index,
  onPress,
  footer,
}: {
  item: Pick<RoutineExercise, 'exerciseName' | 'muscleGroup' | 'imageUrl' | 'targetSets' | 'targetReps' | 'restSeconds'>;
  index: number;
  onPress?: () => void;
  footer?: ReactNode;
}) {
  return (
    <View style={st.row}>
      <Pressable accessibilityRole={onPress ? 'button' : undefined} disabled={!onPress} onPress={onPress} style={st.rowMain}>
        <Text style={st.num}>{index + 1}</Text>
        <ExerciseThumb uri={item.imageUrl} size={48} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={st.exName} numberOfLines={2}>{item.exerciseName}</Text>
          {item.muscleGroup ? <T variant="caption">{item.muscleGroup}</T> : null}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Text style={st.target}>{item.targetSets ?? '–'} × {item.targetReps ?? '–'}</Text>
          {item.restSeconds ? <T variant="caption" style={{ fontSize: 11 }}>{item.restSeconds} s</T> : null}
        </View>
      </Pressable>
      {footer}
    </View>
  );
}

// Cabeçalho do detalhe: "TREINO A", título e resumo.
export function RoutineHeading({ meta, name }: { meta: RoutineMeta; name: string }) {
  const parts = [meta.goal, meta.level?.toLowerCase(), `${meta.sets} séries`, meta.exercises ? `~${meta.minutes} min` : null].filter(Boolean);
  const hasLetterName = /^Treino\s+[A-Z]\s*[-·]/i.test(name);
  return (
    <View style={{ gap: 6 }}>
      {hasLetterName ? <Text style={st.overline}>TREINO {meta.letter}</Text> : null}
      <Text style={st.heading}>{hasLetterName ? [meta.title, meta.subtitle].filter(Boolean).join(' · ') : name}</Text>
      <T variant="caption" style={{ fontSize: 13 }}>{parts.join(' · ')}</T>
    </View>
  );
}

export function GeneratedTag({ label = 'Gerada automaticamente' }: { label?: string }) {
  return (
    <View style={st.genTag}>
      <Text style={st.genTagText}>{label}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  card: { gap: 12, padding: 16, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  letter: { width: 44, height: 44, borderRadius: radius.icon, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  letterText: { fontFamily: fonts.display, fontSize: 18, color: colors.text },
  title: { fontFamily: fonts.extrabold, fontSize: 15, color: colors.text },
  nextTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.chip, backgroundColor: colors.accentSoft },
  nextTagText: { fontFamily: fonts.extrabold, fontSize: 11, color: colors.accent },
  stats: { flexDirection: 'row', gap: 14 },
  stat: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSoft },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.chip, backgroundColor: colors.surface2, maxWidth: '70%' },
  chipText: { fontFamily: fonts.bold, fontSize: 11, color: colors.textSoft },
  row: { gap: 12, padding: 12, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  num: { width: 28, textAlign: 'center', fontFamily: fonts.display, fontSize: 14, color: colors.accent },
  exName: { fontFamily: fonts.extrabold, fontSize: 14, color: colors.text },
  target: { fontFamily: fonts.extrabold, fontSize: 13, color: colors.text },
  overline: { fontFamily: fonts.extrabold, fontSize: 12, letterSpacing: 1, color: colors.textMuted },
  heading: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, color: colors.text },
  genTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.chip, backgroundColor: colors.accentSoft },
  genTagText: { fontFamily: fonts.extrabold, fontSize: 12, color: colors.accent },
});
