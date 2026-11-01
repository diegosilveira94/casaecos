import type {
  ApiMessage,
  AuthenticatedUserResponse,
  CreateUserAccountRequest,
  LoginRequest,
  LoginResponse,
  ResetPasswordRequest,
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

  /** Sets a new password without knowing the current one: needs `account:manage`. */
  resetPassword(personId: number, request: ResetPasswordRequest): Promise<ApiMessage> {
    return this.http.patch(`${ACCOUNTS_PATH}/${String(personId)}/password`, request);
  }
}

export const authService = new AuthService(apiClient);
