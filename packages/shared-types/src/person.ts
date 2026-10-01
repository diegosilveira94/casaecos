export interface RoleResponse {
  id: number;
  description: string;
}

/** The least another resource needs to name a person: no phone or registration number. */
export interface PersonSummaryResponse {
  id: number;
  name: string;
}

export interface PersonResponse {
  id: number;
  name: string;
  role: RoleResponse;
  individualRegistration: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePersonRequest {
  name: string;
  roleId: number;
  individualRegistration?: string | null;
  phone?: string | null;
}

export interface UpdatePersonRequest {
  name?: string;
  roleId?: number;
  individualRegistration?: string | null;
  phone?: string | null;
}
