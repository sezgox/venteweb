import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { importLibrary } from '@googlemaps/js-api-loader';
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

  async searchAddress(query: string): Promise<{lat: number, lng: number, address: string}[] | void> {
     if (!query || !query.trim()) return;
    try {
      console.log(query)
      const { Geocoder } = await importLibrary('geocoding');
      const geocoder = new Geocoder();
      return new Promise((resolve, reject) => {
        geocoder.geocode({ address: query }, (results: any, status: any) => {
          if (status === 'OK' && results && results.length > 0) {
            //return 5 first results
            const items = results.slice(0, 5).map((r: any) => ({
                          lat: r.geometry.location.lat(),
                          lng: r.geometry.location.lng(),
                          address: r.formatted_address
                        }));
            resolve(items);
          } else {
            console.warn('Geocoding failed:', status);
          }
        });
      });
    } catch (err) {
      console.error('searchAddress error', err);
    }
  }

}
