import { router } from 'expo-router';
import { useState } from 'react';

import { taskApi } from '@/api/endpoints';
import { useUserId } from '@/auth/AuthContext';
import {
  buildTaskRequest,
  emptyTaskForm,
  TaskFormFields,
  type TaskFormErrors,
  type TaskFormState,
} from '@/components/rotina/TaskForm';
import { useToast } from '@/components/Toast';
import { Button, ErrorBanner, Header, Screen } from '@/components/ui';
import { useAction } from '@/hooks/useApi';

export default function NovaTarefaScreen() {
  const userId = useUserId();
  const toast = useToast();
  const [form, setForm] = useState<TaskFormState>(emptyTaskForm);
  const [errors, setErrors] = useState<TaskFormErrors>({});
  const save = useAction(taskApi.create);

  async function submit() {
    const { request, errors: e } = buildTaskRequest(form, false);
    setErrors(e);
    if (!request) return;
    const created = await save.run(userId, request);
    if (created) {
      toast.success('Tarefa criada');
      if (router.canGoBack()) router.back();
      else router.replace('/tarefas');
    }
  }

  return (
    <Screen footer={<Button title="Salvar tarefa" onPress={submit} loading={save.pending} />}>
      <Header title="Nova tarefa" />
      {save.error ? <ErrorBanner title="Não foi possível salvar" message={save.error} /> : null}
      <TaskFormFields
        form={form}
        errors={errors}
        autoFocus
        onChange={(patch) => {
          setForm((f) => ({ ...f, ...patch }));
          setErrors((e) => {
            const next = { ...e };
            for (const k of Object.keys(patch)) delete next[(k === 'kind' ? 'days' : k) as keyof TaskFormErrors];
            return next;
          });
        }}
      />
    </Screen>
  );
}
