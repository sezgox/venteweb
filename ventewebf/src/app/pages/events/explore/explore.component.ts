import { NgClass } from '@angular/common';
import { Component, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../../enviroments/enviroment';
import { EventCardComponent } from '../../../components/shared/event-card/event-card.component';
import { HeaderComponent } from '../../../components/shared/header/header.component';
import { LoadingComponent } from '../../../components/shared/loading/loading.component';
import { GetEventsSuccessResponse } from '../../../core/interfaces/api-response.interface';
import { Event, EventCategory, EventFilter } from '../../../core/interfaces/events.interfaces';
import { EventsService } from '../../../core/services/events.service';
import { Visibility } from './../../../core/interfaces/events.interfaces';
import { GeolocationService, UserLocation } from './../../../core/services/geolocation.service';
import { createPopupClass } from './popup.class';


@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [HeaderComponent, FormsModule, NgClass, EventCardComponent, LoadingComponent],
  templateUrl: './explore.component.html',
  styleUrl: './explore.component.css'
})
export class ExploreComponent implements OnInit {

  private readonly geolocationService = inject(GeolocationService);
  private readonly eventsService = inject(EventsService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);

  viewMap: boolean = false;
  loading: boolean = false;
  userLocation: UserLocation | null = null;
  filter: EventFilter = {
    page: 1,
    radius: 15,
    date: new Date(),
    visibility: Visibility.Public
  };
  snapShot: EventFilter = this.filter;
  categories = Object.values(EventCategory);
  visibilities = Visibility;
  events: WritableSignal<Event[]> = signal([]);
  selectedSection: string = 'Explore';

  async ngOnInit() {
    setOptions({
      key: environment.googleMapsApiKey,
    });
    this.userLocation = await this.geolocationService.getUserLocation();
    this.filter.lat = this.userLocation.lat;
    this.filter.lng = this.userLocation.lng;
    this.getEvents();
  }

  snapshotFilter(filter: EventFilter) {
    this.snapShot = {...filter};
    console.log('SnapShot:', this.snapShot);
  }

  now = new Date();
  today = new Date(this.now.getTime() + 24 * 60 * 60 * 1000);
  week = new Date(this.now.getTime() + 7 * 24 * 60 * 60 * 1000);
  month = new Date(this.now.getTime() + 30 * 24 * 60 * 60 * 1000);

  changeDateRange(event: any) {
    const range = event.target.dataset.time;

    switch (range) {
      case 'today':
        // Within 24 hours
        this.filter.endDate = this.today;
        break;

      case 'week':
        // Within 7 days
        this.filter.endDate = this.week;
        break;

      case 'month':
        // Last day of the current month
        this.filter.endDate =this.month;
        break;

      case 'any':
        this.filter.endDate = undefined;
        break;
    }
  }

  selectCategory(category: EventCategory) {
    this.filter.category =  this.filter.category === category ? undefined : category;
  }

  onCancelFilter(){
    console.log(this.snapShot)
    this.filter = {...this.snapShot};
  }

  onApplyFilter(){
    this.snapShot = {...this.filter};
    this.getEvents();
  }

  onClearFilter(){
    this.filter = {
      page: 1,
      radius: 15,
      date: new Date(),
      visibility: Visibility.Public
    }
  }

  onMapBoundsChange(bounds: any) {
    const ne = bounds.getNorthEast(); // north-east
    const sw = bounds.getSouthWest(); // south-west
    this.filter.latMin = sw.lat();
    this.filter.latMax = ne.lat();
    this.filter.lngMin = sw.lng();
    this.filter.lngMax = ne.lng();
    this.getEvents();
  }

  async getEvents(){
    this.loading = true;
    try {
      const response = await this.eventsService.getEvents(this.filter);
      if(response.success){
        this.events.set((response as GetEventsSuccessResponse).results);
        this.selectedSection = (response as GetEventsSuccessResponse).metadata.filter.category || 'Explore';
      }
      if(this.viewMap){
        await this.addEventMarkers();
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      this.toastr.error('Refresh the page to try again','An unexpected error occurred');
    }finally{
      this.loading = false;
    }
  }

  async changeView(){
    this.viewMap = !this.viewMap;
    if(this.viewMap){
      setTimeout(() => {
        this.loadMap();
      });
      await this.getEvents();
    }
  }



  map: any;
  markers: any[] = [];
  infoWindow: any;

  async loadMap(){
    console.log('iniciando mapa')
    await this.initMap();
  }

  async initMap() {
    const { Map } = await importLibrary("maps");

    this.map = new Map(document.getElementById("map")!, {
      center: { lat: this.userLocation!.lat, lng: this.userLocation!.lng },
      zoom: 14,
      mapId: environment.googleMapsMapId,
      disableDefaultUI: true,
      clickableIcons: false,
    });

    await this.addEventMarkers();

    this.map.addListener("click", () => {
      if (this.infoWindow) {
        this.infoWindow.setMap(null);
        this.infoWindow = null;
      }
    });
  }

  buildMiniCard(event: Event) {
  return `
    <div class="flex w-[300px] rounded-xl overflow-hidden shadow-xl bg-bg cursor-pointer">

      <!-- Imagen izquierda -->
      <div class="w-[100px] h-[130px] shrink-0 overflow-hidden">
        <img
          src="${event.poster}"
          alt="${event.name}"
          class="w-full h-full object-cover"
        >
      </div>

      <!-- Info derecha -->
      <div class="flex flex-col justify-center p-3 gap-1 text-text">
        <h3 class="text-sm font-bold leading-tight line-clamp-2">
          ${event.name}
        </h3>

        <p class="text-xs text-gray600 flex items-center gap-1">
          <span>📅</span>
          <span>${new Date(event.startDate).toLocaleString()}</span>
        </p>

        <p class="text-xs text-gray500 flex items-center gap-1">
          <span>📍</span>
          <span class="line-clamp-2">${event.location}</span>
        </p>
      </div>

    </div>
  `;

  }

  async addEventMarkers() {
    const { AdvancedMarkerElement } = await importLibrary("marker");
    const Popup = await createPopupClass();

    // Eliminar marcadores existentes del mapa
    if (this.markers.length) {
      this.markers.forEach(m => m.setMap(null));
    }
    this.markers = [];

    this.infoWindow = null;

    this.markers = this.events().map(event => {
      const marker = new AdvancedMarkerElement({
        position: { lat: event.lat, lng: event.lng },
        map: this.map,
      });

      marker.addListener("click", () => {
        // Cerrar popup previo
        if (this.infoWindow) {
          this.infoWindow.setMap(null);
          this.infoWindow = null;
        }

        // Contenido del popup
        const content = document.createElement("div");
        content.innerHTML = this.buildMiniCard(event);

        content.addEventListener("click", () => {
          this.router.navigate(['/events/event', event.id], { state: { event } });
        });

        // Crear popup
        this.infoWindow = new Popup(
          { lat: event.lat, lng: event.lng },
          content
        );

        this.infoWindow.setMap(this.map);
      });

      return marker;
    });

    console.log(this.markers);
  }


  async findOnMap(){
    const bounds = this.map.getBounds();
    const ne = bounds.getNorthEast(); // north-east
    const sw = bounds.getSouthWest(); // south-west
    this.filter.latMin = sw.lat();
    this.filter.latMax = ne.lat();
    this.filter.lngMin = sw.lng();
    this.filter.lngMax = ne.lng();
    console.log(this.filter)
    await this.getEvents();
  }

}
