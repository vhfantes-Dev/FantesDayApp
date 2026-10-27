import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { exerciseApi } from '@/api/endpoints';
import type { ExerciseRequest } from '@/api/types';
import { useToast } from '@/components/Toast';
import { Button, ErrorBanner, Field, IconButton, LoadingView, Screen, T } from '@/components/ui';
import { DEFAULT_CATEGORY, EQUIPMENT_OPTIONS, equipmentLabel, LEVEL_OPTIONS, levelLabel } from '@/components/workouts/labels';
import { Segmented, SelectField, ToggleChip } from '@/components/workouts/parts';
import { useAction, useApi } from '@/hooks/useApi';
import { colors, fonts } from '@/theme';
import { MUSCLE_GROUPS } from '@/utils/ranks';

const MUSCLE_OPTIONS = MUSCLE_GROUPS.map((m) => ({ value: m, label: m }));
const EQUIP_OPTIONS = EQUIPMENT_OPTIONS.map((e) => ({ value: e, label: e }));
const LEVELS = LEVEL_OPTIONS.map((l) => ({ value: l, label: l }));

export default function NovoExercicioScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = params.id ? Number(params.id) : null;
  const toast = useToast();
  const existing = useApi(() => exerciseApi.get(editId!), [editId], { enabled: !!editId });

  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<string | null>('Máquina');
  const [secondary, setSecondary] = useState<string[]>([]);
  const [level, setLevel] = useState('Iniciante');
  const [instructions, setInstructions] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [errors, setErrors] = useState<{ name?: string; muscle?: string; imageUrl?: string }>({});

  const loaded = existing.data;
  useEffect(() => {
    if (!loaded) return;
    setName(loaded.name);
    setMuscle(loaded.muscleGroup);
    setEquipment(loaded.equipment ? equipmentLabel(loaded.equipment) : null);
    setSecondary((loaded.secondaryMuscles ?? '').split(',').map((s) => s.trim()).filter(Boolean));
    setLevel(levelLabel(loaded.level) || 'Iniciante');
    setInstructions(loaded.instructions ?? '');
    setImageUrl(loaded.imageUrl ?? '');
  }, [loaded]);

  const save = useAction((data: ExerciseRequest) => (editId ? exerciseApi.update(editId, data) : exerciseApi.create(data)));

  function toggleSecondary(m: string) {
    setSecondary((list) => (list.includes(m) ? list.filter((x) => x !== m) : [...list, m]));
  }

  async function submit() {
    const url = imageUrl.trim();
    const next = {
      name: name.trim() ? undefined : 'Dê um nome ao exercício.',
      muscle: muscle ? undefined : 'Escolha o músculo principal.',
      imageUrl: url && !/^https?:\/\/\S+$/i.test(url) ? 'Informe uma URL começando com http:// ou https://' : undefined,
    };
    setErrors(next);
    if (next.name || next.muscle || next.imageUrl) return;
    const saved = await save.run({
      name: name.trim(),
      muscleGroup: muscle!,
      secondaryMuscles: secondary.filter((m) => m !== muscle).join(', '),
      equipment: equipment ?? undefined,
      level,
      category: loaded?.category ?? DEFAULT_CATEGORY,
      instructions: instructions
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .join('\n'),
      imageUrl: url || undefined,
    });
    if (!saved) return;
    toast.success(editId ? 'Exercício atualizado' : 'Exercício criado');
    if (editId) router.back();
    else router.replace({ pathname: '/exercicios/[id]', params: { id: String(saved.id) } });
  }

  const title = editId ? 'Editar exercício' : 'Novo exercício';

  return (
    <Screen contentStyle={{ gap: 16 }}>
      <View style={styles.header}>
        <IconButton icon="close" label="Fechar" onPress={() => (router.canGoBack() ? router.back() : router.replace('/exercicios'))} />
        <Text style={styles.title}>{title}</Text>
        <View style={{ width: 44 }} />
      </View>

      {editId && existing.error && !loaded ? <ErrorBanner message={existing.error.message} onRetry={existing.reload} /> : null}
      {editId && existing.loading && !loaded ? <LoadingView /> : null}

      {!editId || loaded ? (
        <>
          <Field label="Nome" value={name} onChangeText={setName} error={errors.name} placeholder="Ex: Supino na máquina articulada" maxLength={120} autoFocus={!editId} />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <SelectField label="Músculo principal" value={muscle} placeholder="Escolher" options={MUSCLE_OPTIONS} onChange={setMuscle} />
            <SelectField label="Equipamento" value={equipment} options={EQUIP_OPTIONS} onChange={setEquipment} />
          </View>
          {errors.muscle ? <T variant="caption" color={colors.danger} style={{ fontFamily: fonts.semibold, marginTop: -8 }}>{errors.muscle}</T> : null}

          <View style={{ gap: 8 }}>
            <T variant="label">Músculos secundários</T>
            <View style={styles.wrap}>
              {MUSCLE_GROUPS.filter((m) => m !== muscle).map((m) => (
                <ToggleChip key={m} label={m} active={secondary.includes(m)} onPress={() => toggleSecondary(m)} />
              ))}
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <T variant="label">Nível</T>
            <Segmented label="Nível" options={LEVELS} value={level} onChange={setLevel} />
          </View>

          <Field
            label="Instruções (uma por linha)"
            value={instructions}
            onChangeText={setInstructions}
            multiline
            placeholder={'Ajuste o banco.\nEmpurre as alças até estender os braços.\nVolte devagar.'}
            textAlignVertical="top"
            maxLength={3000}
          />

          <Field
            label="Imagem (URL, opcional)"
            value={imageUrl}
            onChangeText={setImageUrl}
            error={errors.imageUrl}
            placeholder="https://"
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {save.error ? <ErrorBanner title="Não foi possível salvar" message={save.error} /> : null}
          <Button title="Salvar exercício" onPress={submit} loading={save.pending} style={{ marginTop: 4 }} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.title, fontSize: 16, color: colors.text },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
