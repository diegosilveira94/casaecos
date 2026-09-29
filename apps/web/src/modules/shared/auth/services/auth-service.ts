import type {
  AuthenticatedUserResponse,
  LoginRequest,
  LoginResponse,
} from '@casaecos/shared-types';

import { apiClient } from '../../../../shared/http/api-client.js';
import type { HttpClient } from '../../../../shared/http/http-client.js';

export class AuthService {
  constructor(private readonly http: HttpClient) {}

  login(credentials: LoginRequest): Promise<LoginResponse> {
    return this.http.post('/auth/login', credentials, { authenticated: false });
  }

  getCurrentUser(): Promise<AuthenticatedUserResponse> {
    return this.http.get('/auth/me');
  }
}

export const authService = new AuthService(apiClient);
