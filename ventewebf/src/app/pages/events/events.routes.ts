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

      { path: 'add', canActivate: [authGuard], loadComponent: () => import('./add-event/add-event.component').then(m => m.AddEventComponent) },
      { path: 'dashboard',  canActivate: [authGuard], loadChildren: () => import('./events-dashboard/events-dashboard.routes').then(m => m.EVENTS_DASHBOARD_ROUTES) },
      { path: '', pathMatch: 'full', redirectTo: 'explore' },
    ],
  },
];
