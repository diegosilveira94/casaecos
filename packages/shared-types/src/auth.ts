import type { RoleResponse } from './person.js';

export interface LoginRequest {
  email: string;
  password: string;
}

/** Identidade do usuário logado: o mínimo que a tela precisa para montar o menu e o RBAC. */
export interface AuthenticatedUserResponse {
  personId: number;
  name: string;
  email: string;
  role: RoleResponse;
}

export interface LoginResponse {
  token: string;
  /** Segundos até o token expirar — evita o frontend decodificar o JWT para saber. */
  expiresInSeconds: number;
  user: AuthenticatedUserResponse;
}

export interface CreateUserAccountRequest {
  personId: number;
  email: string;
  password: string;
}

/** Nunca carrega o hash da senha: ele não sai do banco para a API. */
export interface UserAccountResponse {
  id: number;
  personId: number;
  email: string;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}
