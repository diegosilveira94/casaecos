import type { CreatePersonRequest, PersonResponse } from '@casaecos/shared-types';

// Column sizes of `person` (schema.prisma), which the API also validates.
export const PERSON_NAME_MAX_LENGTH = 45;
export const PERSON_REGISTRATION_MAX_LENGTH = 14;
export const PERSON_PHONE_MAX_LENGTH = 20;

/** The person as the form holds it; an empty string is a field left blank. */
export interface PersonFormValues {
  name: string;
  roleId: number | null;
  individualRegistration: string;
  phone: string;
  /** The homes the person is linked to (`home_person`), saved after the person. */
  homeIds: number[];
}

export type PersonFormErrors = Partial<Record<'name' | 'roleId', string>>;

export function emptyPersonForm(): PersonFormValues {
  return { name: '', roleId: null, individualRegistration: '', phone: '', homeIds: [] };
}

export function personFormFrom(
  person: PersonResponse,
  homeIds: readonly number[],
): PersonFormValues {
  return {
    name: person.name,
    roleId: person.role.id,
    individualRegistration: person.individualRegistration ?? '',
    phone: person.phone ?? '',
    homeIds: [...homeIds],
  };
}

export function validatePersonForm(values: PersonFormValues): PersonFormErrors {
  return {
    ...(values.name.trim() === '' ? { name: 'Informe o nome.' } : {}),
    ...(values.roleId === null ? { roleId: 'Escolha o papel.' } : {}),
  };
}

/** Blank optional fields go as `null`, which clears them on an edit too. */
export function toPersonRequest(values: PersonFormValues): CreatePersonRequest {
  if (values.roleId === null) throw new Error('Validate the form before building the request');

  return {
    name: values.name.trim(),
    roleId: values.roleId,
    individualRegistration: values.individualRegistration.trim() || null,
    phone: values.phone.trim() || null,
  };
}

export function hasPersonFormChanges(
  initial: PersonFormValues,
  current: PersonFormValues,
): boolean {
  const sameHomes =
    initial.homeIds.length === current.homeIds.length &&
    initial.homeIds.every((homeId) => current.homeIds.includes(homeId));

  return (
    !sameHomes ||
    initial.name !== current.name ||
    initial.roleId !== current.roleId ||
    initial.individualRegistration !== current.individualRegistration ||
    initial.phone !== current.phone
  );
}

export interface HomeLinkChanges {
  toLink: number[];
  toUnlink: number[];
}

export function homeLinkChanges(
  linkedHomeIds: readonly number[],
  wantedHomeIds: readonly number[],
): HomeLinkChanges {
  return {
    toLink: wantedHomeIds.filter((homeId) => !linkedHomeIds.includes(homeId)),
    toUnlink: linkedHomeIds.filter((homeId) => !wantedHomeIds.includes(homeId)),
  };
}
