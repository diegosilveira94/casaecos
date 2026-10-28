// Role ids are fixed by the seed (#37), as in role-ids.ts of the API.
export const ROLE_IDS = {
  coordinator: 1,
  secretary: 2,
  caregiver: 3,
  driver: 4,
  sheltered: 5,
  collaborator: 6,
} as const;

/** Tone classes of the CSS (`event-tone--*`), reused so a role has one color everywhere. */
export type RoleTone = 'meeting' | 'therapy' | 'health' | 'school' | 'neutral' | 'activity';

interface RoleGuide {
  tone: RoleTone;
  /** Under the role in the picker: who has it. */
  hint: string;
  /** What logging in with the role allows; `null` for a role that never logs in. */
  access: string | null;
}

const ROLE_GUIDES: Readonly<Partial<Record<number, RoleGuide>>> = {
  [ROLE_IDS.coordinator]: {
    tone: 'meeting',
    hint: 'Equipe',
    access: 'Tudo, inclusive quem acessa o sistema',
  },
  [ROLE_IDS.secretary]: {
    tone: 'therapy',
    hint: 'Equipe',
    access: 'Tudo, menos gerenciar acessos',
  },
  [ROLE_IDS.caregiver]: {
    tone: 'health',
    hint: 'Equipe',
    access: 'Vê a agenda das casas onde trabalha',
  },
  [ROLE_IDS.driver]: {
    tone: 'school',
    hint: 'Atende todas as casas',
    access: 'Vê os compromissos em que dirige',
  },
  [ROLE_IDS.sheltered]: { tone: 'neutral', hint: 'Criança ou adolescente', access: null },
  [ROLE_IDS.collaborator]: {
    tone: 'activity',
    hint: 'Equipe (coringa)',
    access: 'Vê a agenda das casas onde está vinculado',
  },
};

// A role added to the lookup later still shows, as neutral staff with no access text.
const UNKNOWN_ROLE: RoleGuide = { tone: 'neutral', hint: 'Equipe', access: null };

export function roleGuide(roleId: number): RoleGuide {
  return ROLE_GUIDES[roleId] ?? UNKNOWN_ROLE;
}

/** Everyone but the sheltered children: who works in a home. */
export function isStaff(roleId: number): boolean {
  return roleId !== ROLE_IDS.sheltered;
}

/** Roles that may receive a credential: every one with something to see once logged in. */
export function canHaveAccess(roleId: number): boolean {
  return roleGuide(roleId).access !== null;
}

/** Who can answer for a home: the staff that lives its routine, not the drivers. */
export function canBeResponsible(roleId: number): boolean {
  return isStaff(roleId) && roleId !== ROLE_IDS.driver;
}
