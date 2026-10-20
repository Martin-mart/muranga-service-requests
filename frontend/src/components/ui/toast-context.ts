import { createContext } from 'react';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastInput {
  tone: ToastTone;
  title: string;
  message?: string;
}

export interface ToastApi {
  show: (toast: ToastInput) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);
