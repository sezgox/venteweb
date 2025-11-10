import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { setOptions } from '@googlemaps/js-api-loader';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../../enviroments/enviroment';
import { MapComponent } from '../../../components/map/map.component';
import { LoadingComponent } from '../../../components/shared/loading/loading.component';
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
  showMapModal: boolean = false;

  async ngOnInit() {
    this.userLocation = await this.geolocationService.getUserLocation();
    setOptions({
      key: environment.googleMapsApiKey,
    });
    if(this.userLocation){
      this.createEventDto.location = await this.geolocationService.reverseGeocoding(this.userLocation.lat, this.userLocation.lng);
      this.createEventDto.locationAlias = this.createEventDto.location;
      this.createEventDto.lat = this.userLocation.lat;
      this.createEventDto.lng = this.userLocation.lng;
      this.mapLocation.set({lat: this.userLocation.lat, lng: this.userLocation.lng, address: this.createEventDto.location});
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

  async openMapModal() {
    if(!this.userLocation){
      this.userLocation = await this.geolocationService.getLocationByIp();
      this.mapLocation.set({lat: this.userLocation?.lat!, lng: this.userLocation?.lng!, address: this.createEventDto.location});
    }
    //this.loadMap();
    this.showMapModal = true;
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

  mapLocation: WritableSignal<any|null> = signal(null);

  async onAccept(location: {lat: number, lng: number, address: string}){
    this.createEventDto.lat = location.lat;
    this.createEventDto.lng = location.lng;
    this.createEventDto.location = location.address;
    this.createEventDto.locationAlias = location.address;
    this.mapLocation.set({lat: location.lat, lng: location.lng, address: location.address});
    this.showMapModal = false;
  }

  onCancel(){
    this.mapLocation.set({lat: this.createEventDto.lat, lng: this.createEventDto.lng, address: this.createEventDto.location});
    this.showMapModal = false;
  }

}
