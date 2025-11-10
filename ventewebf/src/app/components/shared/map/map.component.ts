import { Component, EventEmitter, Input, Output, WritableSignal } from '@angular/core';
import { Event } from '../../../core/interfaces/events.interfaces';

type MapEvent = Event & { marker?: any };

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [],
  templateUrl: './map.component.html',
  styleUrl: './map.component.css'
})
export class MapComponent {
  @Output() accept = new EventEmitter<void>();
  
  @Input() mapLocation!: WritableSignal<any | null>;

}
