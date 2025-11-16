// event-card.component.ts
import { CommonModule, DatePipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from "@angular/router";
import { CircleIcon, DumbbellIcon, Gamepad2Icon, GraduationCapIcon, HammerIcon, LandmarkIcon, LucideAngularModule, MedalIcon, MusicIcon, PaletteIcon, PartyPopperIcon, PawPrintIcon, PresentationIcon, TrophyIcon, UsersIcon, UtensilsIcon } from 'lucide-angular';
import { Event, EventCategory } from '../../../core/interfaces/events.interfaces';

@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [CommonModule, DatePipe, LucideAngularModule, RouterLink,],
  template: `
  <div
    class="relative w-full aspect-[4/5] overflow-hidden rounded-2xl shadow-2xl transition-transform  cursor-pointer"
    [routerLink]="['/events/event', event.id]" [queryParams]="{invitation: invitationToken}"
    [state]="{ event: event }"
  >
    <!-- Imagen de fondo completa -->
    <img
      [src]="event.poster"
      [alt]="event.name"
      class="absolute inset-0 w-full h-full object-cover transition-transform hover:scale-110"
    />

    <!-- Indicador LIVE (arriba a la izquierda) -->
    @if(isEventLive()) {
      <div class="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600 shadow-lg live-indicator">
        <span class="relative flex h-3 w-3">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-3 w-3 bg-red-200"></span>
        </span>
        <span class="text-white font-bold text-xs uppercase tracking-wider">Live</span>
      </div>
    }

    <!-- Categorías (arriba a la derecha) -->
    <div class="absolute top-3 right-3 flex flex-wrap gap-2 justify-end max-w-[50%]">
      @for(cat of event.categories; track $index){
        <div class="w-10 h-10 rounded-full flex items-center justify-center text-white backdrop-blur-md bg-black/50 shadow-lg">
          <lucide-icon [img]="getCategoryIcon(cat)" [size]="22"></lucide-icon>
        </div>
      }
    </div>

    <!-- Contenido superpuesto estilo Tinder - fondo blanco fijo -->
    <div class="absolute bottom-0 left-0 right-0 p-5 pt-6 flex flex-col gap-3 backdrop-blur-sm"
         style="background: linear-gradient(to top, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.85) 40%, transparent 100%);">

      <!-- Nombre del evento -->
      <h3 class="text-xl font-bold line-clamp-2 text-gray-900"
          [title]="event.name">
        {{ event.name }}
      </h3>

      <!-- Fechas -->
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0 w-5 h-5 mt-0.5 text-[var(--color-primary)]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="16" y1="2" x2="16" y2="6" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="8" y1="2" x2="8" y2="6" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="3" y1="10" x2="21" y2="10" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-gray-800">
            {{ event.startDate | date: 'EEE dd MMM hh:mm a' }}
          </p>
          <p class="text-xs text-gray-600">
            {{ event.endDate | date: 'EEE dd MMM hh:mm a' }}
          </p>
        </div>
      </div>

      <!-- Ubicación -->
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0 w-5 h-5 mt-0.5 text-[var(--color-primary)]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <p class="text-sm line-clamp-2 flex-1 min-w-0 text-gray-600"
           [title]="event.location">
          {{ event.locationAlias }} - {{ event.location }}
        </p>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .cat-icon > svg {
      width: 2rem !important; /* 32px */
      height: 2rem !important; /* 32px */
      display: block;
    }
    .live-indicator {
      animation: pulse-glow 2s ease-in-out infinite;
    }
    @keyframes pulse-glow {
      0%, 100% {
        box-shadow: 0 0 20px rgba(220, 38, 38, 0.6);
      }
      50% {
        box-shadow: 0 0 30px rgba(220, 38, 38, 0.9);
      }
    }
  `]
})
export class EventCardComponent {
  @Input() event!: Event;
  @Input() invitationToken?: string;

  isEventLive(): boolean {
    const now = new Date();
    const start = new Date(this.event.startDate);
    const end = new Date(this.event.endDate);
    return now >= start && now <= end;
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
