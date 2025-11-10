import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../../enviroments/enviroment';
import { LoadingComponent } from '../../../components/shared/loading/loading.component';
import { MapComponent } from '../../../components/shared/map/map.component';
import { CreateEventDto, EventCategory, Visibility } from '../../../core/interfaces/events.interfaces';
import { EventsService } from '../../../core/services/events.service';
import { GeolocationService, UserLocation } from '../../../core/services/geolocation.service';
import { UsersService } from '../../../core/services/users.service';


@Component({
  selector: 'app-add-event',
  standalone: true,
  imports: [ FormsModule, MapComponent, DatePipe, RouterLink, LoadingComponent],
  templateUrl: './add-event.component.html',
  styleUrl: './add-event.component.css'
})
export class AddEventComponent implements OnInit {

  private readonly geolocationService: GeolocationService = inject(GeolocationService);
  private readonly eventsService: EventsService = inject(EventsService);
  private readonly usersService: UsersService = inject(UsersService);
  private readonly toastrService: ToastrService = inject(ToastrService);
  private readonly router: Router = inject(Router);

  userLocation: UserLocation | null = null;

  step = 1;
  validSteps = [false, false, false];

  address: string = '';
  posterPreviewUrl: string = "https://res.cloudinary.com/doqla97yu/image/upload/fl_preserve_transparency/v1760896293/events/default_d16vth.jpg?_s=public-apps";

  createEventDto: CreateEventDto = {
    organizerId: this.usersService.getCurrentUser()?.id!,
    name: '',
    poster: undefined,
    description: '',
    categories: [],
    visibility: Visibility.Public,
    startDate: new Date(new Date().setHours(new Date().getHours() + 4)),
    endDate: new Date(new Date().setHours(new Date().getHours() + 5)),
    maxCollaborators: undefined,
    maxAttendees: undefined,
    requiresRequest: false,
    location: '',
    locationAlias: '',
    lat: 0,
    lng: 0,
  }

  categories = Object.values(EventCategory);

  loading: boolean = false;

  async ngOnInit() {
    this.userLocation = await this.geolocationService.getUserLocation();
    setOptions({
      key: environment.googleMapsApiKey,
    });
    if(this.userLocation){
      this.address = await this.reverseGeocoding(this.userLocation.lat, this.userLocation.lng);
      this.createEventDto.location = this.address;
      this.createEventDto.locationAlias = this.address;
      this.createEventDto.lat = this.userLocation.lat;
      this.createEventDto.lng = this.userLocation.lng;
    }

  }

  validateStep(step: number) {
    let valid = false;
    switch (step) {
      case 1:
        valid = !!this.createEventDto.location && !!this.createEventDto.startDate && !!this.createEventDto.endDate && this.createEventDto.startDate <= this.createEventDto.endDate;
        break;
      case 2:
        valid = !!this.createEventDto.visibility &&
        ((this.createEventDto.requiresRequest && this.createEventDto.maxCollaborators && this.createEventDto.maxCollaborators > 0) ||
        (!this.createEventDto.requiresRequest));
        break;
      case 3:
        valid = !!this.createEventDto.name && this.createEventDto.categories.length >= 1 && this.createEventDto.categories.length <= 3 && !!this.createEventDto.description;
        break;
    }
    if (valid) {
      this.validSteps[step - 1] = true;
      this.step = step + 1;
    } else {
      this.toastrService.clear();
      this.toastrService.warning('Fill in all fields correctly before continuing.');
    }
  }

  goBack(step: number) {
    this.step = step;
  }

  openMapModal() {
    if(!this.userLocation){
      this.geolocationService.getLocationByIp().then(location => {
        this.userLocation = location;
        this.loadMap();
      })
    }else{
      this.loadMap()
    }
  }

  onPosterChange(event: any) {
    this.createEventDto.poster = event.target.files[0];
    try {
      this.posterPreviewUrl = URL.createObjectURL(this.createEventDto.poster!);
    } catch (error) {
      console.error('Error al generar la URL de la imagen poster:', error);
    }
  }

  getReviewData() {
    return this.createEventDto;
  }

  async submit() {
    this.loading = true;
    try {
      const response = await this.eventsService.createEvent(this.createEventDto)
      if(response.success){
        this.router.navigate(['events/dashboard']);
      }else{
        this.toastrService.clear();
        this.toastrService.error(response.message);
      }
    } catch (error) {
      this.toastrService.clear();
      this.toastrService.error('An unexpected error occurred.');
      console.error(error);
    }
    finally {
      this.loading = false;
    }
  }

  /* ********************************************************************** */
  /* ****************************** MAP SHIT ****************************** */
  /* ********************************************************************** */
  map: any
  marker: any;
  mapLocation: WritableSignal<any|null> = signal(null);

  async loadMap(){
    if(!this.map){
      await this.initMap();
    }
    document.getElementById('map-modal')?.showPopover();
  }

  async initMap(){
      const { Map } = await importLibrary("maps");
      this.map = new Map(document.getElementById("map")!, {
          center: { lat: this.userLocation?.lat!, lng: this.userLocation?.lng! },
          zoom: 8,
          mapId: environment.googleMapsMapId,
          disableDefaultUI: true,
          clickableIcons: false,
      });
      this.mapLocation.set({lat: this.userLocation?.lat!, lng: this.userLocation?.lng!, address: this.address});
      this.addMarker(this.userLocation?.lat!, this.userLocation?.lng!)
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
    const address = await this.reverseGeocoding(lat, lng);
    this.mapLocation.set({ lat, lng, address });
  }

  async reverseGeocoding(lat: number, lng: number): Promise<string> {
    const { Geocoder } = await importLibrary("geocoding");
    const geocoder = new Geocoder();

    return new Promise((resolve, reject) => {
      geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
        if (status === 'OK' && results && results.length > 0) {
          resolve(results[0].formatted_address);
        } else {
          console.warn('No se pudo obtener la dirección:', status);
          resolve('Address not available');
        }
      });
    });
  }

  async onAccept(){
    this.createEventDto.lat = this.marker.position.lat;
    this.createEventDto.lng = this.marker.position.lng;
    this.address = await this.reverseGeocoding(this.marker.position.lat, this.marker.position.lng);
    console.log(this.address);
    this.createEventDto.location = this.address;
    this.createEventDto.locationAlias = this.createEventDto.location;
    console.log(this.createEventDto);
    document.getElementById('map-modal')?.hidePopover();
  }
  /* ********************************************************************** */
  /* **************************** END MAP SHIT **************************** */
  /* ********************************************************************** */

}
