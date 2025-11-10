import { inject, Injectable } from '@angular/core';
import { CreateEventResponse, GetEventResponse, GetEventsResponse, ParticipationResponse, RequestCollaborationResponse } from '../interfaces/api-response.interface';
import { CreateEventDto, CreateParticipationDto, CreateRequestDto, EventFilter } from '../interfaces/events.interfaces';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class EventsService {

  private readonly apiService = inject(ApiService);

  constructor() { }

  async createEvent(createEventDto: CreateEventDto): Promise<CreateEventResponse>{
    return await this.apiService.request('POST','/events',this.toFormData(createEventDto))
  }

  async getEvents(filter: EventFilter): Promise<GetEventsResponse>{
    return await this.apiService.request('GET', `/events?${this.toQueryParams(filter)}`);
  }

  async getEvent(id: string, invitation?: string): Promise<GetEventResponse>{
    return await this.apiService.request('GET', `/events/${id}?invitation=${invitation}`);
  }

  async deleteEvent(id: string): Promise<GetEventResponse>{
    return await this.apiService.request('DELETE', `/events/${id}`);
  }

  async requestCollaboration(createRequestDto: CreateRequestDto): Promise<RequestCollaborationResponse>{
    return await this.apiService.request('POST', `/events/${createRequestDto.eventId}/requests`, createRequestDto);
  }

  async participate(createParticipationDto: CreateParticipationDto): Promise<ParticipationResponse>{
    return await this.apiService.request('POST', `/events/${createParticipationDto.eventId}/participations`, createParticipationDto);
  }

  async removeRequest(requestId: string, eventId: string): Promise<RequestCollaborationResponse>{
    return await this.apiService.request('DELETE', `/events/${eventId}/requests/${requestId}`);
  }

  async removeParticipation(participationId: string, eventId: string): Promise<ParticipationResponse>{
    return await this.apiService.request('DELETE', `/events/${eventId}/participations/${participationId}`);
  }

  private toQueryParams(filter: EventFilter): string {
    const params = new URLSearchParams();

    (Object.keys(filter) as (keyof EventFilter)[]).forEach(key => {
      const value = filter[key];
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    return params.toString();
  }

  private toFormData(event: CreateEventDto): FormData {
    const formData = new FormData();
    // ✅ Campos simples
    formData.append('organizerId', event.organizerId);
    formData.append('name', event.name);
    formData.append('description', event.description);
    formData.append('visibility', event.visibility);
    formData.append('startDate', event.startDate.toISOString());
    formData.append('endDate', event.endDate.toISOString());
    if(event.requiresRequest){
      formData.append('requiresRequest', String(event.requiresRequest));
    }
    formData.append('location', event.location);
    formData.append('lat', event.lat.toString());
    formData.append('lng', event.lng.toString());

    // ✅ Campos opcionales
    if (event.maxCollaborators !== undefined)
      formData.append('maxCollaborators', event.maxCollaborators.toString());

    if (event.maxAttendees !== undefined)
      formData.append('maxAttendees', event.maxAttendees.toString());

    // ✅ Categorías (si es array)
    event.categories.forEach((cat, index) => {
      formData.append(`categories[${index}]`, cat.toString());
    });

    // ✅ Archivo (poster)
    if (event.poster) {
      formData.append('poster', event.poster);
    }
    console.log('FormData:');
    formData.forEach((value, key) => {
      console.log(`${key} ->`, value);
    });
    return formData;
  }

}
