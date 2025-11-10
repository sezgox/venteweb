import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../../enviroments/enviroment';
import { ApiError, ApiResponse } from '../interfaces/api-response.interface';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  async request<T, E = any>(method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', endpoint: string, body?: any): Promise<ApiResponse<T> | ApiError<E>> {
    try {
      const response = await lastValueFrom(
        this.http.request<ApiResponse<T>>(method, `${this.apiUrl}${endpoint}`, { body })
      );
      return response; // tipo ApiResponse<T>
    } catch (err: any) {
      // Angular HttpClient envía HttpErrorResponse
      return {
          message: err?.error?.message || 'Error desconocido',
          metadata: err?.error?.metadata,
          success: false
      } as ApiError<E>;
    }
  }
}
