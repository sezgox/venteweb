// pages/events/events.routes.ts
import { Routes } from '@angular/router';

export const EVENTS_DASHBOARD_ROUTES: Routes =
[
  {
    path: '',
    loadComponent: () =>
      import('./events-dashboard.component').then(m => m.EventsDashboardComponent),
  },
  {path: '**', redirectTo: ''}
];
