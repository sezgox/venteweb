import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit {

  private readonly authService = inject(AuthService);
  private router = inject(Router);


  ngOnInit(): void {
    this.authService.isAuthenticated();
  }


  addYourEvent(){
    if( this.authService.isAuthenticated()){
      this.router.navigate(['events/dashboard']);
    }else{
      this.authService.setRedirectUrl('events/dashboard');
      const popover = document.getElementById('auth-modal');
      popover?.showPopover();
    }
  }

}
