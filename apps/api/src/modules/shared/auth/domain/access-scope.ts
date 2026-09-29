import { HttpError } from '../../../../middlewares/http-error.js';
import { EVENT_OUT_OF_SCOPE, HOME_OUT_OF_SCOPE } from '../auth-messages.js';
import { scopeKindForRole } from './permissions.js';

export interface AccessScopeOwner {
  personId: number;
  roleId: number;
  homeIds: readonly number[];
}

export interface ScopedEvent {
  homeId: number;
  participantIds: readonly number[];
}

export type EventScopeFilter =
  | { kind: 'all' }
  | { kind: 'homes'; homeIds: readonly number[] }
  | { kind: 'participant'; personId: number };

export abstract class AccessScope {
  static forOwner(owner: AccessScopeOwner): AccessScope {
    switch (scopeKindForRole(owner.roleId)) {
      case 'all':
        return new UnrestrictedScope();
      case 'participant':
        return new ParticipantScope(owner.personId);
      case 'homes':
        return new HomeScope(owner.homeIds);
    }
  }

  abstract accessibleHomeIds(): readonly number[] | null;
  abstract eventFilter(): EventScopeFilter;
  abstract canAccessHome(homeId: number): boolean;
  abstract canAccessEvent(event: ScopedEvent): boolean;

  assertCanAccessHome(homeId: number): void {
    if (!this.canAccessHome(homeId)) throw HttpError.forbidden(HOME_OUT_OF_SCOPE);
  }

  assertCanAccessEvent(event: ScopedEvent): void {
    if (!this.canAccessEvent(event)) throw HttpError.forbidden(EVENT_OUT_OF_SCOPE);
  }
}

class UnrestrictedScope extends AccessScope {
  accessibleHomeIds(): null {
    return null;
  }

  eventFilter(): EventScopeFilter {
    return { kind: 'all' };
  }

  canAccessHome(_homeId: number): boolean {
    return true;
  }

  canAccessEvent(_event: ScopedEvent): boolean {
    return true;
  }
}

class HomeScope extends AccessScope {
  private readonly homeIds: ReadonlySet<number>;

  constructor(homeIds: readonly number[]) {
    super();
    this.homeIds = new Set(homeIds);
  }

  accessibleHomeIds(): readonly number[] {
    return [...this.homeIds];
  }

  eventFilter(): EventScopeFilter {
    return { kind: 'homes', homeIds: this.accessibleHomeIds() };
  }

  canAccessHome(homeId: number): boolean {
    return this.homeIds.has(homeId);
  }

  canAccessEvent(event: ScopedEvent): boolean {
    return this.canAccessHome(event.homeId);
  }
}

class ParticipantScope extends AccessScope {
  constructor(private readonly personId: number) {
    super();
  }

  accessibleHomeIds(): readonly number[] {
    return [];
  }

  eventFilter(): EventScopeFilter {
    return { kind: 'participant', personId: this.personId };
  }

  canAccessHome(_homeId: number): boolean {
    return false;
  }

  canAccessEvent(event: ScopedEvent): boolean {
    return event.participantIds.includes(this.personId);
  }
}
