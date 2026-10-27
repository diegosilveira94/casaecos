import type {
  ApiMessage,
  AuthenticatedUserResponse,
  LoginRequest,
  LoginResponse,
  ManagedUserAccountResponse,
  ResetPasswordRequest,
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

  listAccounts(): Promise<ManagedUserAccountResponse[]> {
    return this.http.get('/auth/accounts');
  }

  resetPassword(personId: number, request: ResetPasswordRequest): Promise<ApiMessage> {
    return this.http.patch(`/auth/accounts/${String(personId)}/password`, request);
  }
}

export const authService = new AuthService(apiClient);
