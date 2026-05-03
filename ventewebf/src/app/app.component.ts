import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppOpenPromptComponent } from './components/app-open-prompt/app-open-prompt.component';
import { AuthComponent } from './components/auth/auth.component';
import { ThemeService } from './core/services/theme.service';
import { UsersService } from './core/services/users.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AuthComponent, AppOpenPromptComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {

  private readonly themeService = inject(ThemeService);
  private readonly usersService = inject(UsersService);

  title = 'ventewebf';
}
