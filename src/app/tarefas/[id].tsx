import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { taskApi } from '@/api/endpoints';
import { Icon } from '@/components/Icon';
import { timeOfDateTime } from '@/components/rotina/dates';
import {
  buildTaskRequest,
  emptyTaskForm,
  TaskFormFields,
  taskToForm,
  type TaskFormErrors,
  type TaskFormState,
} from '@/components/rotina/TaskForm';
import { useToast } from '@/components/Toast';
import { Button, ErrorBanner, Header, IconButton, Screen, SkeletonList, T } from '@/components/ui';
import { useAction, useApi } from '@/hooks/useApi';
import { colors, fonts } from '@/theme';
import { shortDate, today } from '@/utils/format';

export default function EditarTarefaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const taskId = Number(id);
  const toast = useToast();
  const { data: task, error, loading, reload, setData } = useApi(() => taskApi.get(taskId), [taskId]);
  const [form, setForm] = useState<TaskFormState>(emptyTaskForm);
  const [errors, setErrors] = useState<TaskFormErrors>({});
  const initialized = useRef(false);
  const save = useAction(taskApi.update);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (task && !initialized.current) {
      initialized.current = true;
      setForm(taskToForm(task));
    }
  }, [task]);

  async function submit() {
    const { request, errors: e } = buildTaskRequest(form, true);
    setErrors(e);
    if (!request) return;
    const updated = await save.run(taskId, request);
    if (updated) {
      toast.success('Tarefa atualizada');
      router.back();
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Excluir tarefa?',
      task?.recurring
        ? 'O hábito some da sua lista. O XP dos dias já concluídos continua com você.'
        : 'A tarefa some da sua lista. Se ela já foi concluída, o XP dela é descontado.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await taskApi.remove(taskId);
              toast.success('Tarefa excluída');
              router.back();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Não foi possível excluir.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }

  async function uncomplete() {
    if (!task) return;
    setToggling(true);
    try {
      setData(await taskApi.uncomplete(task.id, task.referenceDate));
      toast.success('Tarefa desmarcada');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível desmarcar.');
    } finally {
      setToggling(false);
    }
  }

  return (
    <Screen
      footer={task ? <Button title="Salvar alterações" onPress={submit} loading={save.pending} /> : undefined}
    >
      <Header
        title="Editar tarefa"
        right={
          <IconButton
            icon="trash"
            label="Excluir tarefa"
            color={colors.danger}
            onPress={deleting ? undefined : confirmDelete}
            style={styles.deleteButton}
          />
        }
      />

      {error && !task ? <ErrorBanner message={error.message} onRetry={reload} /> : null}
      {loading && !task ? <SkeletonList rows={4} /> : null}
      {save.error ? <ErrorBanner title="Não foi possível salvar" message={save.error} /> : null}

      {task ? (
        <>
          {task.completed ? (
            <View style={styles.done}>
              <View style={styles.doneIcon}>
                <Icon name="check" size={20} color={colors.onAccent} strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <T style={{ fontFamily: fonts.bold, fontSize: 14 }}>
                  {task.referenceDate === today() ? 'Concluída hoje' : `Concluída em ${shortDate(task.referenceDate)}`}
                </T>
                {task.completedAt ? (
                  <T variant="caption" color={colors.textLabel}>às {timeOfDateTime(task.completedAt)}</T>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={uncomplete}
                disabled={toggling}
                style={({ pressed }) => [styles.undo, (pressed || toggling) && { opacity: 0.6 }]}
              >
                <Text style={styles.undoText}>Desmarcar</Text>
              </Pressable>
            </View>
          ) : null}

          <TaskFormFields
            form={form}
            errors={errors}
            onChange={(patch) => {
              setForm((f) => ({ ...f, ...patch }));
              setErrors({});
            }}
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  deleteButton: { borderColor: colors.dangerBorder, backgroundColor: '#1A1214' },
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentSoftBorder,
  },
  doneIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  undo: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3A4A26',
    justifyContent: 'center',
  },
  undoText: { fontFamily: fonts.bold, fontSize: 13, color: colors.text },
});
