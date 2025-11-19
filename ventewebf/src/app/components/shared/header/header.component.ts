import { NgClass } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { PFP_URL } from '../../../core/consts/pfp.const';
import { NotificationsSuccessResponse } from '../../../core/interfaces/api-response.interface';
import { Event } from '../../../core/interfaces/events.interfaces';
import { UserSummary } from '../../../core/interfaces/user.interfaces';
import { AuthService } from '../../../core/services/auth.service';
import { Notification, NotificationsService, NotificationType } from '../../../core/services/notifications.service';
import { ThemeService } from '../../../core/services/theme.service';
import { UsersService } from '../../../core/services/users.service';
import { EventFormComponent } from '../event-form/event-form.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, NgClass, EventFormComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit{

  private sub: Subscription | null = null;
  public themeService = inject(ThemeService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly usersService = inject(UsersService);
  private readonly notificationsService = inject(NotificationsService);

  activeTheme: string = 'light';
  loggedIn = this.authService.isAuthenticated();
  user: UserSummary | null = null;
  notifications: Notification[] = [];
  showModalEventForm: boolean = false;
  pfp = PFP_URL;

  ngOnInit(): void {

  this.usersService.currentUser$.subscribe(user => {
      this.user = user;
      if (user) {
        this.loggedIn = true;
        this.getNotifications();
        const token = localStorage.getItem('access_token');
        if (token) this.notificationsService.connect(token);
      }else{
        this.loggedIn = false;
      }
    });


    this.notificationsService.notifications$.subscribe(notifications => {
      this.notifications.unshift(...notifications);
    });
  }

  async getNotifications() {
    const res = await this.notificationsService.getNotifications();
    if(res.success){
      this.notifications = (res as NotificationsSuccessResponse).results;
    }else{
      this.notifications = [];
    }
  }

  async markAsRead(id: string) {
    const res = await this.notificationsService.markAsRead(id);
    const notification = this.notifications.find(n => n.id === id);
    if(res.success){
      notification!.read = true;
    }
  }

  goToNotification(notification: Notification){
    this.markAsRead(notification.id);
    const eventNotificationTypes = [
      NotificationType.Participation,
      NotificationType.RequestCollaboration,
      NotificationType.InvitationAnswered,
      NotificationType.Reminder,
      NotificationType.Rating,
      NotificationType.Post,
    ];
    if(eventNotificationTypes.includes(notification.type)){
      this.router.navigate(['/events/event', notification.relatedId]);
    }else{
      this.router.navigate(['/events/dashboard'], {state: {menuOption: notification.type}});
    }
  }

  signIn(){
      const popover = document.getElementById('auth-modal');
      popover?.showPopover();
  }

  toggleTheme() {
    this.activeTheme = this.activeTheme === 'light' ? 'dark' : 'light';
    this.themeService.toggleDarkMode();
  }

  showMenu(){
    document.getElementById("menu")?.showPopover();
  }
  hideMenu(){
    document.getElementById("menu")?.hidePopover();
  }

  logout(){
    localStorage.removeItem("access_token");
    this.loggedIn = false;
    this.usersService.clearCurrentUser();
    window.location.reload();
  }

  get notificationsNotRead(): boolean{
    return this.notifications.some(n => !n.read)
  }

  redirectToEvent(event: Event){
    this.router.navigate(['/events/event', event.id]);
  }
}
