import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api';
import type { Application, Cell, Notification, Page } from './types';

export function useQueue(params: { status?: string; q?: string; page?: number }) {
  return useQuery({
    queryKey: ['queue', params],
    queryFn: () =>
      apiFetch<Page<Application>>('/applications', {
        query: { scope: 'queue', status: params.status, q: params.q, page: params.page ?? 1, limit: 20 },
      }),
  });
}

export function useApplication(id: string | undefined) {
  return useQuery({
    queryKey: ['application', id],
    queryFn: () => apiFetch<Application>(`/applications/${id}`),
    enabled: !!id,
  });
}

export function useStageAction(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { stageId: string; action: 'approve' | 'return' | 'reject'; comment?: string }) =>
      apiFetch<Application>(`/applications/${appId}/stages/${v.stageId}/${v.action}`, {
        method: 'POST',
        body: v.action === 'approve' ? { comment: v.comment } : { comment: v.comment ?? '' },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['application', appId] });
      void qc.invalidateQueries({ queryKey: ['queue'] });
    },
  });
}

export function useGenerateDocument(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch(`/applications/${appId}/document/generate`, { method: 'POST', body: {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['application', appId] }),
  });
}

export function useConfirmSignature(appId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch(`/applications/${appId}/confirm-signature`, { method: 'POST', body: {} }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['application', appId] });
      void qc.invalidateQueries({ queryKey: ['queue'] });
    },
  });
}

export function useCells(status?: string) {
  return useQuery({ queryKey: ['cells', status], queryFn: () => apiFetch<Cell[]>('/cells', { query: { status } }) });
}

export function useIssueCell() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cellId: string) => apiFetch(`/cells/${cellId}/issue`, { method: 'POST', body: {} }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['cells'] });
      void qc.invalidateQueries({ queryKey: ['queue'] });
    },
  });
}

export function useNotifications() {
  return useQuery({ queryKey: ['notifications'], queryFn: () => apiFetch<Notification[]>('/notifications') });
}
