import { Box, Button, InputAdornment, TextField, Typography } from '@mui/material';
import { useState } from 'react';

import type { PersonResponse } from '@casaecos/shared-types';

import { useApiResource } from '../../../../shared/http/use-api-resource.js';
import { FormSelect } from '../../../../shared/ui/FormSelect.js';
import { PlusIcon, SearchIcon } from '../../../../shared/ui/icons.js';
import { LoadingStatus } from '../../../../shared/ui/LoadingStatus.js';
import { EmptyState } from '../../../../shared/ui/EmptyState.js';
import { LoadError } from '../../../../shared/ui/LoadError.js';
import { Pager } from '../../../../shared/ui/Pager.js';
import { PAGE_SIZES, paginate, type PageSize } from '../../../../shared/ui/pagination.js';
import { RecordList, RecordRow, RecordRowButton } from '../../../../shared/ui/RecordList.js';
import {
  RECORD_CELL_SX,
  RECORD_META_SX,
  RECORD_NAME_SX,
} from '../../../../shared/ui/record-list-sx.js';
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
      <Box
        sx={{
          display: 'grid',
          gap: 1.25,
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 22rem) 14rem auto' },
          justifyContent: { md: 'space-between' },
          mt: 2.5,
          mb: 2,
        }}
      >
        <TextField
          size="small"
          type="search"
          label="Buscar por nome"
          placeholder="Buscar por nome"
          value={search}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          onChange={(inputEvent) => {
            setSearch(inputEvent.target.value);
            setPage(1);
          }}
        />
        <FormSelect
          size="small"
          label="Papel"
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
        </FormSelect>
        {canWrite ? (
          <Button
            variant="contained"
            startIcon={<PlusIcon />}
            disabled={!canOpenForm}
            onClick={() => {
              setFormTarget({ person: null });
            }}
          >
            Nova pessoa
          </Button>
        ) : null}
      </Box>

      {memberships.status === 'failed' ? (
        <LoadError message={memberships.message} onRetry={reloadMemberships} />
      ) : null}
      {people.resource.status === 'failed' ? (
        <LoadError message={people.resource.message} onRetry={people.reload} />
      ) : people.resource.status === 'loading' ? (
        <LoadingStatus>Carregando pessoas...</LoadingStatus>
      ) : visible.length === 0 ? (
        <EmptyState
          title={
            allPeople.length === 0
              ? 'Nenhuma pessoa cadastrada.'
              : 'Ninguém com esse nome ou papel.'
          }
        >
          {allPeople.length === 0
            ? 'Cadastre a equipe e os acolhidos para montar as casas.'
            : 'Confira a busca ou cadastre a pessoa.'}
        </EmptyState>
      ) : (
        <>
          {visible.length === allPeople.length ? null : (
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
              {visible.length} de {allPeople.length} pessoas com esse filtro
            </Typography>
          )}
          <RecordList
            columns="minmax(0, 1.6fr) 10rem minmax(0, 1.4fr) 9.5rem 6rem"
            headers={['Nome', 'Papel', 'Casas', 'Telefone', 'Sistema']}
          >
            {pageWindow.items.map((person) => {
              const homes = homesText(person, loadedMemberships);
              const cells = (
                <>
                  <Box component="span" sx={RECORD_NAME_SX}>
                    {person.name}
                  </Box>
                  <RoleLabel role={person.role} />
                  <Box component="span" sx={RECORD_CELL_SX}>
                    {homes}
                  </Box>
                  <Box component="span" sx={RECORD_CELL_SX}>
                    {person.phone ?? '—'}
                  </Box>
                  <Box component="span" sx={RECORD_CELL_SX}>
                    {person.hasAccount ? (
                      <Typography color="primary" component="span" variant="body2">
                        Acessa
                      </Typography>
                    ) : (
                      '—'
                    )}
                  </Box>
                  <Box component="span" sx={RECORD_META_SX}>
                    {homes}
                    {person.hasAccount ? ' · acessa o sistema' : ''}
                  </Box>
                </>
              );
              return (
                <li key={person.id}>
                  {canWrite ? (
                    <RecordRowButton
                      isDisabled={!canOpenForm}
                      onClick={() => {
                        setFormTarget({ person });
                      }}
                    >
                      {cells}
                    </RecordRowButton>
                  ) : (
                    <RecordRow>{cells}</RecordRow>
                  )}
                </li>
              );
            })}
          </RecordList>
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
