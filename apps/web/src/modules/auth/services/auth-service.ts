import { httpClient } from '../../shared/http/http-client.js';

export interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
}

export class AuthService {
  login(credentials: LoginCredentials): Promise<LoginResponse> {
    return httpClient.request<LoginResponse>('/auth/login', {
      authenticated: false,
      body: credentials,
      method: 'POST',
    });
  }
}

export const authService = new AuthService();
