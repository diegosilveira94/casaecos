import type {
  AuthenticatedUserResponse,
  CreateUserAccountRequest,
  LoginRequest,
  LoginResponse,
  UserAccountListItemResponse,
  UserAccountResponse,
} from '@casaecos/shared-types';

import { apiClient } from '../../../../shared/http/api-client.js';
import type { HttpClient } from '../../../../shared/http/http-client.js';

const ACCOUNTS_PATH = '/auth/accounts';

export class AuthService {
  constructor(private readonly http: HttpClient) {}

  login(credentials: LoginRequest): Promise<LoginResponse> {
    return this.http.post('/auth/login', credentials, { authenticated: false });
  }

  getCurrentUser(): Promise<AuthenticatedUserResponse> {
    return this.http.get('/auth/me');
  }

  /** Who can log in: needs `account:manage`. */
  listAccounts(): Promise<UserAccountListItemResponse[]> {
    return this.http.get(ACCOUNTS_PATH);
  }

  /** Gives a person a credential: needs `account:manage`. */
  createAccount(request: CreateUserAccountRequest): Promise<UserAccountResponse> {
    return this.http.post(ACCOUNTS_PATH, request);
  }
}

export const authService = new AuthService(apiClient);
