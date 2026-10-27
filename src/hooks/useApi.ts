import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '@/api/client';

interface ApiState<T> {
  data: T | undefined;
  error: ApiError | null;
  loading: boolean;
  refreshing: boolean;
  // Busca de novo mostrando o "puxar para atualizar".
  refresh: () => Promise<void>;
  // Busca de novo sem indicador (ex: depois de uma ação).
  reload: () => Promise<void>;
  setData: (updater: T | ((prev: T | undefined) => T)) => void;
}

// Busca dados da API e busca de novo sempre que a tela volta ao foco.
// deps: quando mudam, a busca é refeita (ex: a data selecionada).
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = [], options: { enabled?: boolean } = {}): ApiState<T> {
  const enabled = options.enabled ?? true;
  const [data, setDataState] = useState<T>();
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const requestId = useRef(0);
  const loadedOnce = useRef(false);

  const run = useCallback(async (mode: 'initial' | 'refresh' | 'silent') => {
    const id = ++requestId.current;
    if (mode === 'initial') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    try {
      const result = await fetcherRef.current();
      if (id !== requestId.current) return;
      setDataState(result);
      setError(null);
    } catch (e) {
      if (id !== requestId.current) return;
      setError(e instanceof ApiError ? e : new ApiError(0, 'Algo deu errado. Tente de novo.'));
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
        loadedOnce.current = true;
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void run('initial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  useFocusEffect(
    useCallback(() => {
      if (enabled && loadedOnce.current) void run('silent');
    }, [enabled, run]),
  );

  const setData = useCallback((updater: T | ((prev: T | undefined) => T)) => {
    setDataState((prev) => (typeof updater === 'function' ? (updater as (p: T | undefined) => T)(prev) : updater));
  }, []);

  return {
    data,
    error,
    loading,
    refreshing,
    refresh: () => run('refresh'),
    reload: () => run('silent'),
    setData,
  };
}

// Executa uma ação (POST/PATCH/DELETE) controlando o estado de envio e o erro.
export function useAction<A extends unknown[], R>(action: (...args: A) => Promise<R>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef(action);
  ref.current = action;

  const run = useCallback(async (...args: A): Promise<R | undefined> => {
    setPending(true);
    setError(null);
    try {
      return await ref.current(...args);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Algo deu errado. Tente de novo.');
      return undefined;
    } finally {
      setPending(false);
    }
  }, []);

  return { run, pending, error, setError };
}
