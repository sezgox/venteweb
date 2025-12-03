import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../../components/shared/header/header.component';

@Component({
  standalone: true,
  selector: 'app-events',
  imports: [RouterOutlet, HeaderComponent],
  template: `
      <app-header></app-header>
      <router-outlet></router-outlet>
  `,
})
export class EventsComponent{ }
