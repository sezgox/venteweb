import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy: number;
  source: 'geolocation' | 'ip' | 'default';
}


@Injectable({
  providedIn: 'root'
})
export class GeolocationService {

  private readonly api = inject(ApiService);

  constructor(private http: HttpClient) {}

  /**
   * Intenta obtener la ubicación precisa del usuario.
   * Si falla, usa IP. Si no hay IP, usa una por defecto.
   */
  async getUserLocation(): Promise<UserLocation> {
    try {
      const position = await this.getBrowserGeolocation();
      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        source: 'geolocation'
      };
    } catch (error) {
      console.warn('⚠️ No se pudo obtener ubicación precisa:', error);
      return await this.getLocationByIp();
    }
  }

  async getLocationByIp(): Promise<UserLocation> {

      try {
        const ipData: any = await firstValueFrom(this.http.get('https://ipapi.co/json/'));
        return {
          lat: ipData.latitude,
          lng: ipData.longitude,
          accuracy: 50000,
          source: 'ip'
        };
      } catch (ipError) {
        console.warn('⚠️ No se pudo obtener ubicación por IP:', ipError);
        return {
          lat: 40.4168,
          lng: -3.7038,
          accuracy: 100000,
          source: 'default'
        };
      }
  }

  private getBrowserGeolocation(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject('Geolocation API no soportada.');
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0
      });
    });
  }

}
