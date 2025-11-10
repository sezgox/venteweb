import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthComponent } from './components/auth/auth.component';
import { ThemeService } from './core/services/theme.service';
import { UsersService } from './core/services/users.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AuthComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {

  private readonly themeService = inject(ThemeService);
  private readonly UsersService = inject(UsersService);

  title = 'ventewebf';
}
