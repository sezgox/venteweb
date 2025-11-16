// pages/events/events.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const EVENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./events.component').then(m => m.EventsComponent),
    children: [
      {
        path: 'explore',
        loadComponent: () =>
          import('./explore/explore.component').then(m => m.ExploreComponent),
      },
      {
        path: 'event/:id',
        loadComponent: () =>
          import('./event/event.component').then(
            m => m.EventComponent
          ),
      },
      { path: 'dashboard',  canActivate: [authGuard], loadComponent: () => import('./events-dashboard/events-dashboard.component').then(m => m.EventsDashboardComponent) },
      { path: '', pathMatch: 'full', redirectTo: 'explore' },
    ],
  },
];
