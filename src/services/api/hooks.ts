import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiError } from './client';

// Simple in-memory cache for query results
const queryCache = new Map<string, { data: unknown; timestamp: number }>();

export interface ApiQueryResult<T> {
  data: T | null;
  error: ApiError | Error | null;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => Promise<void>;
}

export function useApiQuery<T>(
  key: string,
  fn: (signal: AbortSignal) => Promise<T>,
  deps: React.DependencyList = []
): ApiQueryResult<T> {
  const cached = queryCache.get(key);
  const [data, setData] = useState<T | null>((cached?.data as T) ?? null);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!cached);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(
    async (showLoading = false) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (showLoading && !data) {
        setIsLoading(true);
      }
      setIsFetching(true);
      setError(null);

      try {
        const result = await fn(controller.signal);
        if (!controller.signal.aborted) {
          setData(result);
          queryCache.set(key, { data: result, timestamp: Date.now() });
          setError(null);
        }
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        if (err instanceof Error) {
          setError(err);
        } else {
          setError(new Error('Unknown query error'));
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          setIsFetching(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, ...deps]
  );

  useEffect(() => {
    execute(!queryCache.has(key));
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [execute, key]);

  const refetch = useCallback(() => execute(false), [execute]);

  return { data, error, isLoading, isFetching, refetch };
}

export interface ApiMutationResult<TData, TVariables> {
  mutate: (vars: TVariables) => Promise<TData>;
  data: TData | null;
  error: ApiError | Error | null;
  isLoading: boolean;
  reset: () => void;
}

export function useApiMutation<TData, TVariables>(
  fn: (vars: TVariables) => Promise<TData>
): ApiMutationResult<TData, TVariables> {
  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const mutate = useCallback(
    async (vars: TVariables): Promise<TData> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fn(vars);
        setData(result);
        return result;
      } catch (err: unknown) {
        const parsedError =
          err instanceof Error ? err : new Error('Mutation failed');
        setError(parsedError);
        throw parsedError;
      } finally {
        setIsLoading(false);
      }
    },
    [fn]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { mutate, data, error, isLoading, reset };
}
