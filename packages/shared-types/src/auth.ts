import type { RoleResponse } from './person.js';

export interface LoginRequest {
  email: string;
  password: string;
}

/** Who is logged in: the least the screen needs for its menu and the RBAC. */
export interface AuthenticatedUserResponse {
  personId: number;
  name: string;
  email: string;
  role: RoleResponse;
}

export interface LoginResponse {
  token: string;
  /** Seconds until the token expires, so the frontend never decodes the JWT. */
  expiresInSeconds: number;
  user: AuthenticatedUserResponse;
}

export interface CreateUserAccountRequest {
  personId: number;
  email: string;
  password: string;
}

/** Never carries the password hash: it does not leave the database. */
export interface UserAccountResponse {
  id: number;
  personId: number;
  email: string;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}
