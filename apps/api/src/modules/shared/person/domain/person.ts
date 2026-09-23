import type { PersonResponse, RoleResponse } from '@casaecos/shared-types';

export class Role {
  constructor(
    readonly id: number,
    readonly description: string,
  ) {}

  toResponse(): RoleResponse {
    return { id: this.id, description: this.description };
  }
}

export interface PersonProperties {
  id: number;
  name: string;
  role: Role;
  individualRegistration: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Person {
  readonly id: number;
  readonly name: string;
  readonly role: Role;
  readonly individualRegistration: string | null;
  readonly phone: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(properties: PersonProperties) {
    this.id = properties.id;
    this.name = properties.name;
    this.role = properties.role;
    this.individualRegistration = properties.individualRegistration;
    this.phone = properties.phone;
    this.createdAt = properties.createdAt;
    this.updatedAt = properties.updatedAt;
  }

  toResponse(): PersonResponse {
    return {
      id: this.id,
      name: this.name,
      role: this.role.toResponse(),
      individualRegistration: this.individualRegistration,
      phone: this.phone,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
