import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NotificationsSuccessResponse } from '../../../core/interfaces/api-response.interface';
import { Notification, NotificationsService, NotificationType } from '../../../core/services/notifications.service';

type SocialSection = 'notifications' | 'threads' | 'activity';

@Component({
  selector: 'app-social',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './social.component.html',
  styleUrl: './social.component.css',
})
export class SocialComponent implements OnInit {
  private readonly notificationsService = inject(NotificationsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toastr = inject(ToastrService);

  notifications: Notification[] = [];
  loading = false;
  activeSection: SocialSection = 'notifications';

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const section = params.get('section');
      this.activeSection = this.isSocialSection(section) ? section : 'notifications';
    });

    void this.loadNotifications();
    this.notificationsService.notifications$.subscribe(incoming => {
      this.notifications.unshift(...incoming);
    });
  }

  selectSection(section: SocialSection): void {
    this.activeSection = section;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { section },
      queryParamsHandling: 'merge',
    });
  }

  async markAsRead(id: string): Promise<void> {
    const res = await this.notificationsService.markAsRead(id);
    if (!res.success) {
      this.toastr.error(res.message ?? 'Could not mark notification as read');
      return;
    }

    const notification = this.notifications.find(item => item.id === id);
    if (notification) {
      notification.read = true;
    }
  }

  async markAllAsRead(): Promise<void> {
    const unread = this.notifications.filter(item => !item.read);
    if (!unread.length) {
      this.toastr.info('No unread notifications');
      return;
    }

    await Promise.all(unread.map(item => this.notificationsService.markAsRead(item.id)));
    this.notifications = this.notifications.map(item => ({ ...item, read: true }));
    this.toastr.success('All notifications marked as read');
  }

  async goToNotification(notification: Notification): Promise<void> {
    await this.markAsRead(notification.id);
    const eventNotificationTypes = [
      NotificationType.Participation,
      NotificationType.RequestCollaboration,
      NotificationType.InvitationAnswered,
      NotificationType.Reminder,
      NotificationType.Rating,
      NotificationType.Post,
    ];

    if (eventNotificationTypes.includes(notification.type)) {
      await this.router.navigate(['/events/event', notification.relatedId]);
    } else {
      await this.router.navigate(['/events/dashboard'], { state: { menuOption: notification.type } });
    }
  }

  get unreadCount(): number {
    return this.notifications.filter(item => !item.read).length;
  }

  private async loadNotifications(): Promise<void> {
    this.loading = true;
    try {
      const res = await this.notificationsService.getNotifications();
      if (res.success) {
        this.notifications = (res as NotificationsSuccessResponse).results;
      } else {
        this.notifications = [];
        this.toastr.error(res.message ?? 'Could not load notifications');
      }
    } finally {
      this.loading = false;
    }
  }

  private isSocialSection(section: string | null): section is SocialSection {
    return section === 'notifications' || section === 'threads' || section === 'activity';
  }
}
