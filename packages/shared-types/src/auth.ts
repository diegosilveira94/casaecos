export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

export interface CreateCredentialRequest {
  personId: number;
  email: string;
  password: string;
}

export interface CredentialResponse {
  id: number;
  personId: number;
  email: string;
}

export interface AuthTokenPayload {
  personId: number;
  role: string;
}
