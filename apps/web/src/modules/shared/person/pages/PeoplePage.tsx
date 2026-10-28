import { useState } from 'react';

import type { PersonResponse } from '@casaecos/shared-types';

import { useApiResource } from '../../../../shared/http/use-api-resource.js';
import { ChevronDownIcon, PlusIcon, SearchIcon } from '../../../../shared/ui/icons.js';
import { LoadError } from '../../../../shared/ui/LoadError.js';
import { Pager } from '../../../../shared/ui/Pager.js';
import { PAGE_SIZES, paginate, type PageSize } from '../../../../shared/ui/pagination.js';
import { useAuth } from '../../auth/context/use-auth.js';
import { useHomeMemberships, type HomeMemberships } from '../../home/hooks/use-home-memberships.js';
import { PersonFormDialog } from '../components/PersonFormDialog.js';
import { RoleLabel } from '../components/RoleLabel.js';
import { ROLE_IDS } from '../domain/roles.js';
import { personService } from '../services/person-service.js';

const ALL_ROLES = '';

/** `null` registers a new person. */
interface FormTarget {
  person: PersonResponse | null;
}

function normalized(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR');
}

function homesText(person: PersonResponse, memberships: HomeMemberships | null): string {
  const names = memberships?.homesOf(person.id).map(({ name }) => name) ?? [];
  if (names.length > 0) return names.join(', ');
  return person.role.id === ROLE_IDS.driver ? 'Todas as casas' : 'Sem casa';
}

/** Everyone the NGO registers: sheltered children and staff, with their role and homes. */
export function PeoplePage(): React.JSX.Element {
  const { can } = useAuth();
  const canWrite = can('person:write');
  const people = useApiResource('people', () => personService.list());
  const roles = useApiResource('roles', () => personService.listRoles());
  const { memberships, reload: reloadMemberships } = useHomeMemberships();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState(ALL_ROLES);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(PAGE_SIZES[0]);
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);

  const loadedMemberships = memberships.status === 'loaded' ? memberships.data : null;
  const roleOptions = roles.resource.status === 'loaded' ? roles.resource.data : [];
  // The form shows the homes of the person: opened without them, saving would unlink all.
  const canOpenForm = loadedMemberships !== null && roles.resource.status === 'loaded';

  const reloadAll = (): void => {
    people.reload();
    reloadMemberships();
  };

  const allPeople = people.resource.status === 'loaded' ? people.resource.data : [];
  const term = normalized(search.trim());
  const visible = allPeople.filter(
    (person) =>
      (term === '' || normalized(person.name).includes(term)) &&
      (roleFilter === ALL_ROLES || person.role.id === Number(roleFilter)),
  );
  const pageWindow = paginate(visible, page, pageSize);

  return (
    <>
      <div className="list-toolbar">
        <label className="search-input">
          <span className="visually-hidden">Buscar por nome</span>
          <SearchIcon />
          <input
            type="search"
            placeholder="Buscar por nome"
            value={search}
            onChange={(inputEvent) => {
              setSearch(inputEvent.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          <span className="visually-hidden">Papel</span>
          <span className="form-select form-select--compact">
            <select
              value={roleFilter}
              onChange={(changeEvent) => {
                setRoleFilter(changeEvent.target.value);
                setPage(1);
              }}
            >
              <option value={ALL_ROLES}>Todos os papéis</option>
              {roleOptions.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.description}
                </option>
              ))}
            </select>
            <ChevronDownIcon />
          </span>
        </label>
        {canWrite ? (
          <button
            className="primary-button primary-button--compact"
            type="button"
            disabled={!canOpenForm}
            onClick={() => {
              setFormTarget({ person: null });
            }}
          >
            <PlusIcon />
            Nova pessoa
          </button>
        ) : null}
      </div>

      {memberships.status === 'failed' ? (
        <LoadError message={memberships.message} onRetry={reloadMemberships} />
      ) : null}
      {people.resource.status === 'failed' ? (
        <LoadError message={people.resource.message} onRetry={people.reload} />
      ) : people.resource.status === 'loading' ? (
        <p className="day-events__status" role="status">
          <span className="spinner spinner--primary spinner--small" aria-hidden="true" />
          Carregando pessoas...
        </p>
      ) : visible.length === 0 ? (
        <div className="empty-state">
          <strong>
            {allPeople.length === 0
              ? 'Nenhuma pessoa cadastrada.'
              : 'Ninguém com esse nome ou papel.'}
          </strong>
          {allPeople.length === 0
            ? 'Cadastre a equipe e os acolhidos para montar as casas.'
            : 'Confira a busca ou cadastre a pessoa.'}
        </div>
      ) : (
        <>
          {visible.length === allPeople.length ? null : (
            <p className="list-summary">
              {visible.length} de {allPeople.length} pessoas com esse filtro
            </p>
          )}
          <ul className="record-list people-columns">
            <li className="record-list__header" aria-hidden="true">
              <span>Nome</span>
              <span>Papel</span>
              <span>Casas</span>
              <span>Telefone</span>
              <span>Sistema</span>
            </li>
            {pageWindow.items.map((person) => {
              const homes = homesText(person, loadedMemberships);
              const cells = (
                <>
                  <span className="record-row__name">{person.name}</span>
                  <RoleLabel role={person.role} />
                  <span className="record-row__cell--desktop">{homes}</span>
                  <span className="record-row__cell--desktop">{person.phone ?? '—'}</span>
                  <span className="record-row__cell--desktop">
                    {person.hasAccount ? <span className="access-mark">Acessa</span> : '—'}
                  </span>
                  <span className="record-row__meta">
                    {homes}
                    {person.hasAccount ? ' · acessa o sistema' : ''}
                  </span>
                </>
              );
              return (
                <li key={person.id}>
                  {canWrite ? (
                    <button
                      className="record-row"
                      type="button"
                      disabled={!canOpenForm}
                      onClick={() => {
                        setFormTarget({ person });
                      }}
                    >
                      {cells}
                    </button>
                  ) : (
                    <div className="record-row">{cells}</div>
                  )}
                </li>
              );
            })}
          </ul>
          <Pager
            window={pageWindow}
            pageSize={pageSize}
            onChangePage={setPage}
            onChangePageSize={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </>
      )}

      {formTarget && loadedMemberships ? (
        <PersonFormDialog
          person={formTarget.person}
          linkedHomeIds={
            formTarget.person
              ? loadedMemberships.homesOf(formTarget.person.id).map(({ id }) => id)
              : []
          }
          homes={loadedMemberships.homes}
          roles={roleOptions}
          onStored={reloadAll}
          onClose={() => {
            setFormTarget(null);
          }}
        />
      ) : null}
    </>
  );
}
