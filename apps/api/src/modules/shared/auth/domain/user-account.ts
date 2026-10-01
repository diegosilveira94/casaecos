import type { AuthenticatedUserResponse, UserAccountResponse } from '@casaecos/shared-types';

import type { Role } from '../../person/domain/person.js';
import { AccessScope } from './access-scope.js';
import { roleHasPermission, type Permission } from './permissions.js';

export interface AuthenticatedUserProperties {
  personId: number;
  name: string;
  email: string;
  role: Role;
  homeIds: readonly number[];
}

/** The user behind an authenticated request. Carries the role for the RBAC. */
export class AuthenticatedUser {
  readonly personId: number;
  readonly name: string;
  readonly email: string;
  readonly role: Role;
  readonly scope: AccessScope;

  constructor(properties: AuthenticatedUserProperties) {
    this.personId = properties.personId;
    this.name = properties.name;
    this.email = properties.email;
    this.role = properties.role;
    this.scope = AccessScope.forOwner({
      personId: properties.personId,
      roleId: properties.role.id,
      homeIds: properties.homeIds,
    });
  }

  can(permission: Permission): boolean {
    return roleHasPermission(this.role.id, permission);
  }

  toResponse(): AuthenticatedUserResponse {
    return {
      personId: this.personId,
      name: this.name,
      email: this.email,
      role: this.role.toResponse(),
    };
  }
}

export interface UserAccountProperties {
  id: number;
  personId: number;
  personName: string;
  email: string;
  passwordHash: string;
  role: Role;
  homeIds: readonly number[];
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class UserAccount {
  readonly id: number;
  readonly personId: number;
  readonly personName: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly role: Role;
  readonly homeIds: readonly number[];
  readonly lastLoginAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(properties: UserAccountProperties) {
    this.id = properties.id;
    this.personId = properties.personId;
    this.personName = properties.personName;
    this.email = properties.email;
    this.passwordHash = properties.passwordHash;
    this.role = properties.role;
    this.homeIds = properties.homeIds;
    this.lastLoginAt = properties.lastLoginAt;
    this.createdAt = properties.createdAt;
    this.updatedAt = properties.updatedAt;
  }

  toAuthenticatedUser(): AuthenticatedUser {
    return new AuthenticatedUser({
      personId: this.personId,
      name: this.personName,
      email: this.email,
      role: this.role,
      homeIds: this.homeIds,
    });
  }

  // passwordHash is left out on purpose: a password hash never leaves the API.
  toResponse(): UserAccountResponse {
    return {
      id: this.id,
      personId: this.personId,
      email: this.email,
      lastLoginAt: this.lastLoginAt?.toISOString() ?? null,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
