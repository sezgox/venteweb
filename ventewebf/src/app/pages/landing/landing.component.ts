import { Component } from '@angular/core';
import { RouterLink } from "@angular/router";
import { NavbarComponent } from '../../components/shared/navbar/navbar.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [NavbarComponent, RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent {

}
