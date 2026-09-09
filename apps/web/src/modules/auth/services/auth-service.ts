import type { LoginRequest, LoginResponse } from '@casaecos/shared-types';

import { httpClient } from '../../shared/http/http-client.js';

export class AuthService {
  login(credentials: LoginRequest): Promise<LoginResponse> {
    return httpClient.request<LoginResponse>('/auth/login', {
      authenticated: false,
      body: credentials,
      method: 'POST',
    });
  }
}

export const authService = new AuthService();
