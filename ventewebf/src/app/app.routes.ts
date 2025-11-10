import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '',  loadComponent: () => import('./pages/landing/landing.component').then(m => m.LandingComponent) },
  {
    path: 'events',
    loadChildren: () =>
      import('./pages/events/events.routes').then(m => m.EVENTS_ROUTES)
  },
  {path: 'user/:username', loadComponent: () => import('./pages/account/profile/profile.component').then(m => m.ProfileComponent)},
  { path: '**', redirectTo: '' }
];
