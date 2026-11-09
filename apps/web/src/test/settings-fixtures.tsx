import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { vi } from 'vitest';

import type {
  AuthenticatedUserResponse,
  HomeResponse,
  Permission,
  PersonResponse,
} from '@casaecos/shared-types';

import { AuthContext, type AuthContextValue } from '../modules/shared/auth/context/auth-context.js';
import { HomeSelectionContext } from '../modules/shared/home/context/home-selection-context.js';

const STAMP = '2026-10-01T10:00:00.000Z';

export const COORDINATOR_PERMISSIONS: Permission[] = [
  'account:manage',
  'person:read',
  'person:write',
  'home:read',
  'home:write',
  'event:read',
  'event:write',
];

export const SECRETARY_PERMISSIONS = COORDINATOR_PERMISSIONS.filter(
  (permission) => permission !== 'account:manage',
);

export const ROLES = [
  { id: 1, description: 'Coordenador' },
  { id: 2, description: 'Secretário' },
  { id: 3, description: 'Cuidador/Monitor' },
  { id: 4, description: 'Motorista' },
  { id: 5, description: 'Acolhido' },
  { id: 6, description: 'Colaborador' },
];

export function makePerson(
  id: number,
  name: string,
  roleId: number,
  overrides: Partial<PersonResponse> = {},
): PersonResponse {
  const role = ROLES.find((candidate) => candidate.id === roleId) ?? {
    id: roleId,
    description: '',
  };
  return {
    id,
    name,
    role,
    individualRegistration: null,
    phone: null,
    hasAccount: false,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  };
}

export function makeHome(id: number, name: string, responsible: PersonResponse): HomeResponse {
  return {
    id,
    name,
    organization: { id: 1, name: 'Associação Ecos da Esperança' },
    responsible,
    createdAt: STAMP,
    updatedAt: STAMP,
  };
}

function authAs(permissions: Permission[], personId: number): AuthContextValue {
  const user: AuthenticatedUserResponse = {
    personId,
    name: 'Ana Ribeiro',
    email: 'ana@ecos.org',
    role: { id: 1, description: 'Coordenador' },
    permissions,
  };
  return {
    status: 'authenticated',
    user,
    login: vi.fn(),
    logout: vi.fn(),
    can: (permission) => permissions.includes(permission),
  };
}

interface RenderOptions {
  permissions?: Permission[];
  personId?: number;
  /** The route pattern of the page and the path it opens at. */
  route?: { path: string; at: string };
}

/** Renders a settings page logged in, inside a router, as the app does. */
export function renderSettingsPage(
  page: React.ReactNode,
  { permissions = COORDINATOR_PERMISSIONS, personId = 1, route }: RenderOptions = {},
): { reloadHomes: ReturnType<typeof vi.fn> } {
  const reloadHomes = vi.fn();
  render(
    <AuthContext value={authAs(permissions, personId)}>
      <HomeSelectionContext
        value={{
          homes: [],
          selectedHomeId: null,
          canChooseHome: false,
          selectHome: vi.fn(),
          reloadHomes,
        }}
      >
        <MemoryRouter initialEntries={[route?.at ?? '/']}>
          <Routes>
            <Route path={route?.path ?? '/'} element={page} />
            <Route path="*" element={<p>Outra página</p>} />
          </Routes>
        </MemoryRouter>
      </HomeSelectionContext>
    </AuthContext>,
  );
  return { reloadHomes };
}
