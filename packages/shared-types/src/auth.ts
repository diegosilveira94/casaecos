import type { RoleResponse } from './person.js';

export interface LoginRequest {
  email: string;
  password: string;
}

/** `resource:action` pairs of the RBAC. The role → permission map lives in the API. */
export type Permission =
  | 'account:manage'
  | 'person:read'
  | 'person:write'
  | 'home:read'
  | 'home:write'
  | 'event:read'
  | 'event:write';

/** Who is logged in: the least the screen needs for its menu and the RBAC. */
export interface AuthenticatedUserResponse {
  personId: number;
  name: string;
  email: string;
  role: RoleResponse;
  /** What the role allows, so the screen hides what the user cannot do. */
  permissions: Permission[];
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
