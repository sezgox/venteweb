import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [],
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
      this.router.navigate(['events/add']);
    }else{
      this.authService.setRedirectUrl('events/add');
      const popover = document.getElementById('auth-modal');
      popover?.showPopover();
    }
  }

}
