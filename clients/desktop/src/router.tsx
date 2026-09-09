import type { RouteObject } from 'react-router-dom';
import { AppShell } from './features/shell/AppShell';
import { LoginPage } from './features/auth/LoginPage';
import { QueuePage } from './features/applications/QueuePage';
import { ReviewPage } from './features/applications/ReviewPage';
import { CellsPage } from './features/cells/CellsPage';
import { RegistryPage } from './features/absences/RegistryPage';
import { TypesPage } from './features/admin/TypesPage';
import { TypeEditorPage } from './features/admin/TypeEditorPage';
import { AnalyticsPage } from './features/admin/AnalyticsPage';
import { EventLogPage } from './features/admin/EventLogPage';
import { AnnouncementsPage } from './features/announcements/AnnouncementsPage';
import { SlotsAdminPage } from './features/slots/SlotsAdminPage';
import { NotificationsPage } from './features/notifications/NotificationsPage';

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <QueuePage /> },
      { path: 'queue', element: <QueuePage /> },
      { path: 'applications/:id', element: <ReviewPage /> },
      { path: 'cells', element: <CellsPage /> },
      { path: 'registry', element: <RegistryPage /> },
      { path: 'announcements', element: <AnnouncementsPage /> },
      { path: 'slots', element: <SlotsAdminPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'admin/types', element: <TypesPage /> },
      { path: 'admin/types/:id', element: <TypeEditorPage /> },
      { path: 'admin/analytics', element: <AnalyticsPage /> },
      { path: 'admin/event-log', element: <EventLogPage /> },
    ],
  },
];
