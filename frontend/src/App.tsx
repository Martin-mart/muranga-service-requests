import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { RouterProvider } from 'react-router';
import { AuthProvider } from './components/auth/AuthProvider';
import { ThemeProvider } from './components/layout/ThemeProvider';
import { ToastProvider } from './components/ui/ToastProvider';
import { router } from './router';
import { createQueryClient } from './utils/query-client';

export function App() {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
