import { Component, EventEmitter, inject, Input, OnInit, Output, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { environment } from '../../../enviroments/enviroment';
import { Event } from '../../core/interfaces/events.interfaces';
import { GeolocationService } from '../../core/services/geolocation.service';

type MapEvent = Event & { marker?: any };

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './map.component.html',
  styleUrl: './map.component.css'
})
export class MapComponent implements OnInit {

  @Output() accept = new EventEmitter<{lat: number, lng: number, address: string}>();
  @Output() cancel = new EventEmitter<void>();

  @Input() mapLocation!: WritableSignal<{lat: number, lng: number, address: string} | null>;

  private readonly geolocationService: GeolocationService = inject(GeolocationService);

  async ngOnInit() {
    setOptions({
      key: environment.googleMapsApiKey,
    });
    this.loadMap();
  }

  suggestedAddresses: {lat: number, lng: number, address: string}[] = [];
  query: string = '';

  map: any
  marker: any;

  async loadMap(){
    if(!this.map){
      await this.initMap();
    }
    document.getElementById('map-modal')?.showPopover();
  }

  async initMap(){
      const { Map } = await importLibrary("maps");
      this.map = new Map(document.getElementById("map")!, {
          center: { lat: this.mapLocation()?.lat!, lng: this.mapLocation()?.lng! },
          zoom: 8,
          mapId: environment.googleMapsMapId,
          disableDefaultUI: true,
          clickableIcons: false,
      });
      this.mapLocation.set({lat: this.mapLocation()?.lat!, lng: this.mapLocation()?.lng!, address: this.mapLocation()?.address!});
      this.addMarker(this.mapLocation()?.lat!, this.mapLocation()?.lng!)
      this.map.addListener('click', (event: any) => {
        if (!event.latLng) return;
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        console.log('📍 Click en:', lat, lng);
        this.addMarker(lat,lng)
      });
  }

  async addMarker(lat: number, lng: number){
    const { AdvancedMarkerElement } = await importLibrary("marker");
    if(this.marker){
      this.marker.map = null;
    }

    this.marker = new AdvancedMarkerElement({
      map: this.map,
      position: { lat, lng },
    });
    const address = await this.geolocationService.reverseGeocoding(lat, lng);
    this.mapLocation.set({ lat, lng, address });
  }

  async searchAddress() {
    if(!this.query){
      this.suggestedAddresses = [];
      return;
    }
    const results =  await this.geolocationService.searchAddress(this.query.trim());
    this.suggestedAddresses = results ? results : [];
  }

  async onSelectAddress(location: {lat: number, lng: number, address: string}){
    this.map!.setCenter({ lat: location.lat, lng: location.lng });
    this.map!.setZoom(14);
    this.addMarker(location.lat, location.lng);
    this.suggestedAddresses = [];
  }

  clearSearch(inputEl?: HTMLInputElement) {
    if (inputEl) inputEl.value = '';
  }

  onCancel(){
    this.cancel.emit();
  }

  onAccept(){
    this.accept.emit({lat: this.mapLocation()?.lat!, lng: this.mapLocation()?.lng!, address: this.mapLocation()?.address!});
  }

}
