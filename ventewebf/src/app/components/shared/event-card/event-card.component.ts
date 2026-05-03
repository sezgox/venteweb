import { CommonModule, DatePipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CircleIcon, DumbbellIcon, Gamepad2Icon, GraduationCapIcon, HammerIcon, LandmarkIcon, LucideAngularModule, MedalIcon, MusicIcon, PaletteIcon, PartyPopperIcon, PawPrintIcon, PresentationIcon, TrophyIcon, UsersIcon, UtensilsIcon } from 'lucide-angular';
import { EVENT_POSTER_DEFAULT_URL } from '../../../core/consts/event-poster.const';
import { Event, EventCategory } from '../../../core/interfaces/events.interfaces';

@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [CommonModule, DatePipe, LucideAngularModule, RouterLink],
  template: `
  <div
    class="event-card"
    [routerLink]="['/events/event', event.id]"
    [queryParams]="{ invitation: invitationToken }"
    [state]="{ event: event }"
  >
    <img
      [src]="getPosterUrl(event.poster)"
      (error)="onPosterError($event)"
      [alt]="event.name"
      class="event-card__poster"
    />

    @if (isEventLive()) {
      <div class="event-card__live live-indicator">
        <span class="relative flex h-3 w-3">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-3 w-3 bg-red-200"></span>
        </span>
        <span class="text-white font-bold text-xs uppercase tracking-wider">Live</span>
      </div>
    }

    <div class="event-card__category-row">
      @for (cat of getCategories(); track $index) {
        <div class="event-card__category">
          <lucide-icon [img]="getCategoryIcon(cat)" [size]="22"></lucide-icon>
        </div>
      }
    </div>

    <div class="event-card__overlay"></div>

    <div class="event-card__body">
      <div class="event-card__eyebrow-row">
        <span class="event-card__eyebrow">{{ getVisibilityLabel() }}</span>
        <span class="event-card__capacity">
          {{ getParticipationCount() }}
          @if (event.maxAttendees) { / {{ event.maxAttendees }} }
        </span>
      </div>

      <h3 class="event-card__title line-clamp-2" [title]="event.name">{{ event.name }}</h3>

      <div class="event-card__meta">
        <div class="event-card__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="16" y1="2" x2="16" y2="6" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="8" y1="2" x2="8" y2="6" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="3" y1="10" x2="21" y2="10" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="event-card__meta-copy">
          <p class="event-card__meta-primary">{{ event.startDate | date: 'EEE dd MMM hh:mm a' }}</p>
          <p class="event-card__meta-secondary">{{ event.endDate | date: 'EEE dd MMM hh:mm a' }}</p>
        </div>
      </div>

      <div class="event-card__meta">
        <div class="event-card__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div class="event-card__meta-copy">
          <p class="event-card__meta-primary truncate">{{ event.locationAlias }}</p>
          <p class="event-card__meta-secondary truncate">{{ event.location }}</p>
        </div>
      </div>

      <div class="event-card__footer">
        <span>Open event</span>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .event-card {
      position: relative;
      width: 100%;
      aspect-ratio: 4 / 5;
      overflow: hidden;
      border-radius: 1.7rem;
      cursor: pointer;
      border: 1px solid rgba(20, 34, 56, 0.08);
      box-shadow: 0 24px 54px rgba(20, 34, 56, 0.16);
      isolation: isolate;
      transform: translateZ(0);
    }
    .event-card:hover .event-card__poster {
      transform: scale(1.06);
    }
    .event-card__poster {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.5s ease;
    }
    .event-card__overlay {
      position: absolute;
      inset: 0;
      background:
        linear-gradient(180deg, rgba(10, 16, 28, 0.08) 0%, rgba(10, 16, 28, 0.22) 26%, rgba(10, 16, 28, 0.86) 100%);
    }
    .event-card__body {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      gap: 0.95rem;
      padding: 1.25rem;
      color: #fff;
    }
    .event-card__eyebrow-row,
    .event-card__footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .event-card__eyebrow,
    .event-card__capacity {
      display: inline-flex;
      align-items: center;
      min-height: 2rem;
      padding: 0.35rem 0.75rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      background: rgba(255, 255, 255, 0.14);
      backdrop-filter: blur(12px);
    }
    .event-card__title {
      margin: 0;
      font-size: 1.45rem;
      font-weight: 800;
      line-height: 1.08;
      letter-spacing: -0.04em;
    }
    .event-card__meta {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }
    .event-card__icon {
      display: grid;
      place-items: center;
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 0.85rem;
      background: rgba(255, 255, 255, 0.14);
      color: #fff4ef;
      backdrop-filter: blur(12px);
    }
    .event-card__meta-copy {
      min-width: 0;
    }
    .event-card__meta-primary {
      margin: 0;
      font-size: 0.92rem;
      font-weight: 700;
    }
    .event-card__meta-secondary {
      margin: 0.2rem 0 0;
      font-size: 0.76rem;
      color: rgba(255, 255, 255, 0.74);
    }
    .event-card__footer span {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.7rem 0.9rem;
      border-radius: 1rem;
      background: rgba(255, 255, 255, 0.14);
      font-size: 0.82rem;
      font-weight: 700;
      backdrop-filter: blur(12px);
    }
    .event-card__category-row {
      position: absolute;
      top: 1rem;
      right: 1rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.55rem;
      justify-content: flex-end;
      max-width: 55%;
      z-index: 1;
    }
    .event-card__category {
      display: grid;
      place-items: center;
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 999px;
      color: white;
      background: rgba(10, 16, 28, 0.4);
      backdrop-filter: blur(14px);
      box-shadow: 0 10px 24px rgba(10, 16, 28, 0.18);
    }
    .event-card__live {
      position: absolute;
      top: 1rem;
      left: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.65rem 0.85rem;
      border-radius: 999px;
      background: rgba(225, 29, 72, 0.88);
      box-shadow: 0 16px 32px rgba(225, 29, 72, 0.28);
      z-index: 1;
    }
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .live-indicator {
      animation: pulse-glow 2s ease-in-out infinite;
    }
    @keyframes pulse-glow {
      0%, 100% {
        box-shadow: 0 0 20px rgba(225, 29, 72, 0.5);
      }
      50% {
        box-shadow: 0 0 32px rgba(225, 29, 72, 0.82);
      }
    }
  `]
})
export class EventCardComponent {
  @Input() event!: Event;
  @Input() invitationToken?: string;
  readonly defaultPoster = EVENT_POSTER_DEFAULT_URL;

  getPosterUrl(poster?: string | null): string {
    return poster?.trim() ? poster : this.defaultPoster;
  }

  onPosterError(event: globalThis.Event): void {
    const target = event.target as HTMLImageElement | null;
    if (!target || target.src === this.defaultPoster) return;
    target.src = this.defaultPoster;
  }

  isEventLive(): boolean {
    const now = new Date();
    const start = new Date(this.event.startDate);
    const end = new Date(this.event.endDate);
    return now >= start && now <= end;
  }

  getParticipationCount(): number {
    return this.event?.participations?.length ?? 0;
  }

  getCategories(): Array<string | EventCategory> {
    return this.event?.categories ?? [];
  }

  getVisibilityLabel(): string {
    return this.event?.visibility ?? 'Public';
  }

  getCategoryIcon(category: string | EventCategory): any {
    const normalized = (Object.values(EventCategory) as string[])
      .find(v => v.toLowerCase() === String(category).toLowerCase()) as EventCategory | undefined;
    const map: Record<EventCategory, any> = {
      [EventCategory.Sports]: DumbbellIcon,
      [EventCategory.Educational]: GraduationCapIcon,
      [EventCategory.Pets]: PawPrintIcon,
      [EventCategory.Gaming]: Gamepad2Icon,
      [EventCategory.Political]: LandmarkIcon,
      [EventCategory.Food]: UtensilsIcon,
      [EventCategory.Party]: PartyPopperIcon,
      [EventCategory.Music]: MusicIcon,
      [EventCategory.Meetup]: UsersIcon,
      [EventCategory.Art]: PaletteIcon,
      [EventCategory.Conference]: PresentationIcon,
      [EventCategory.Workshop]: HammerIcon,
      [EventCategory.Competition]: MedalIcon,
      [EventCategory.Tournament]: TrophyIcon,
    };
    return normalized ? map[normalized] : CircleIcon;
  }
}
