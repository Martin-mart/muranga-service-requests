import { lazy } from 'react';
import { createBrowserRouter } from 'react-router';
import { GuestOnly, RequireAuth } from './components/auth/RequireAuth';
import { AppShell } from './components/layout/AppShell';
import { RouteError } from './components/layout/RouteError';

// Route-level code splitting: citizens never download admin/chart code.
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const GuestPage = lazy(() => import('./pages/auth/GuestPage'));
const CheckEmailPage = lazy(() => import('./pages/auth/CheckEmailPage'));
const AuthCallbackPage = lazy(() => import('./pages/auth/AuthCallbackPage'));
const MyRequestsPage = lazy(() => import('./pages/citizen/MyRequestsPage'));
const NewRequestPage = lazy(() => import('./pages/citizen/NewRequestPage'));
const RequestDetailPage = lazy(() => import('./pages/citizen/RequestDetailPage'));
const NotificationsPage = lazy(() => import('./pages/citizen/NotificationsPage'));
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'));
const AdminRequestsPage = lazy(() => import('./pages/admin/AdminRequestsPage'));
const AdminRequestDetailPage = lazy(() => import('./pages/admin/AdminRequestDetailPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <LandingPage /> },
      {
        path: 'login',
        element: (
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        ),
      },
      {
        path: 'register',
        element: (
          <GuestOnly>
            <RegisterPage />
          </GuestOnly>
        ),
      },
      { path: 'guest', element: <GuestPage /> },
      { path: 'check-email', element: <CheckEmailPage /> },
      { path: 'auth/callback', element: <AuthCallbackPage /> },
      {
        path: 'requests',
        element: (
          <RequireAuth requiredRole="citizen">
            <MyRequestsPage />
          </RequireAuth>
        ),
      },
      {
        path: 'requests/new',
        element: (
          <RequireAuth requiredRole="citizen">
            <NewRequestPage />
          </RequireAuth>
        ),
      },
      {
        path: 'requests/:id',
        element: (
          <RequireAuth requiredRole="citizen">
            <RequestDetailPage />
          </RequireAuth>
        ),
      },
      {
        path: 'notifications',
        element: (
          <RequireAuth requiredRole="citizen">
            <NotificationsPage />
          </RequireAuth>
        ),
      },
      {
        path: 'admin',
        element: (
          <RequireAuth requiredRole="admin">
            <DashboardPage />
          </RequireAuth>
        ),
      },
      {
        path: 'admin/requests',
        element: (
          <RequireAuth requiredRole="admin">
            <AdminRequestsPage />
          </RequireAuth>
        ),
      },
      {
        path: 'admin/requests/:id',
        element: (
          <RequireAuth requiredRole="admin">
            <AdminRequestDetailPage />
          </RequireAuth>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
