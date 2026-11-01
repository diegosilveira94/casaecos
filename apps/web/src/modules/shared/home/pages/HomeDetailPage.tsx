import { Box, Button, Chip, FormHelperText, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';

import type { HomeResponse, PersonResponse } from '@casaecos/shared-types';

import { ApiRequestError } from '../../../../shared/http/api-request-error.js';
import { useApiResource } from '../../../../shared/http/use-api-resource.js';
import { AlertMessage } from '../../../../shared/ui/AlertMessage.js';
import { ConfirmDialog } from '../../../../shared/ui/ConfirmDialog.js';
import { ChevronLeftIcon, PlusIcon } from '../../../../shared/ui/icons.js';
import { LoadError } from '../../../../shared/ui/LoadError.js';
import { LoadingStatus } from '../../../../shared/ui/LoadingStatus.js';
import { useAuth } from '../../auth/context/use-auth.js';
import { RoleLabel } from '../../person/components/RoleLabel.js';
import { isStaff } from '../../person/domain/roles.js';
import { personService } from '../../person/services/person-service.js';
import { HomeFormDialog } from '../components/HomeFormDialog.js';
import { LinkPeopleDialog } from '../components/LinkPeopleDialog.js';
import { useHomeSelection } from '../context/use-home-selection.js';
import { HOMES_PATH } from '../home-paths.js';
import { homeService } from '../services/home-service.js';

function BackToHomes(): React.JSX.Element {
  return (
    <Button
      component={Link}
      to={HOMES_PATH}
      startIcon={<ChevronLeftIcon />}
      sx={{ mt: 2.5, mb: 1 }}
    >
      Casas
    </Button>
  );
}

const UNLINK_ERROR_MESSAGE = 'Não foi possível remover a pessoa da casa. Tente novamente.';

interface HomeDetail {
  home: HomeResponse;
  members: PersonResponse[];
}

async function loadHomeDetail(homeId: number): Promise<HomeDetail> {
  const [home, members] = await Promise.all([
    homeService.get(homeId),
    homeService.listPeople(homeId),
  ]);
  return { home, members };
}

interface MemberGroupProps {
  title: string;
  members: readonly PersonResponse[];
  responsibleId: number;
  canWrite: boolean;
  onRemove: (person: PersonResponse) => void;
}

function MemberGroup({
  title,
  members,
  responsibleId,
  canWrite,
  onRemove,
}: MemberGroupProps): React.JSX.Element {
  return (
    <Box component="section" sx={{ mt: 3 }}>
      <Stack
        component="h3"
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', m: 0, mb: 1, fontSize: '0.95rem', fontWeight: 700 }}
      >
        {title} <Chip size="small" label={members.length} />
      </Stack>
      {members.length === 0 ? (
        <FormHelperText>Ninguém vinculado ainda.</FormHelperText>
      ) : (
        <Stack component="ul" spacing={1}>
          {members.map((person) => {
            const isResponsible = person.id === responsibleId;
            return (
              <Box
                component="li"
                key={person.id}
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  columnGap: 1.5,
                  rowGap: 0.5,
                  minHeight: '3.25rem',
                  py: 1,
                  pr: 1,
                  pl: 2,
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 3,
                }}
              >
                <Typography noWrap component="span" sx={{ flex: 1, minWidth: '8rem' }}>
                  {person.name}
                  {isResponsible ? (
                    <Typography component="span" variant="body2" sx={{ color: 'text.secondary' }}>
                      {' '}
                      · responsável
                    </Typography>
                  ) : null}
                </Typography>
                <RoleLabel role={person.role} />
                {canWrite ? (
                  <Button
                    color="inherit"
                    size="small"
                    disabled={isResponsible}
                    title={isResponsible ? 'Troque o responsável antes de remover' : undefined}
                    aria-label={`Remover ${person.name} da casa`}
                    onClick={() => {
                      onRemove(person);
                    }}
                  >
                    Remover
                  </Button>
                ) : null}
              </Box>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}

/** One home: its data and the people linked to it, sheltered children and staff. */
export function HomeDetailPage(): React.JSX.Element {
  const { homeId: homeIdParam } = useParams();
  const homeId = Number(homeIdParam);
  const isValidId = Number.isInteger(homeId) && homeId > 0;

  if (!isValidId) return <Navigate to={HOMES_PATH} replace />;
  return <HomeDetail homeId={homeId} />;
}

function HomeDetail({ homeId }: { homeId: number }): React.JSX.Element {
  const { can } = useAuth();
  const canWrite = can('home:write');
  const navigate = useNavigate();
  const { reloadHomes } = useHomeSelection();
  const detail = useApiResource(`home:${String(homeId)}`, () => loadHomeDetail(homeId));
  const people = useApiResource('people', () => personService.list());
  const [dialog, setDialog] = useState<'edit' | 'link' | null>(null);
  const [leaving, setLeaving] = useState<PersonResponse | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  if (detail.resource.status !== 'loaded') {
    return (
      <>
        <BackToHomes />
        {detail.resource.status === 'failed' ? (
          <LoadError message={detail.resource.message} onRetry={detail.reload} />
        ) : (
          <LoadingStatus>Carregando casa...</LoadingStatus>
        )}
      </>
    );
  }

  const { home, members } = detail.resource.data;
  const memberIds = members.map(({ id }) => id);
  const allPeople = people.resource.status === 'loaded' ? people.resource.data : null;

  const reloadDetail = (): void => {
    detail.reload();
    people.reload();
  };

  async function unlink(person: PersonResponse): Promise<void> {
    setIsUnlinking(true);
    try {
      await homeService.unlinkPerson(home.id, person.id);
      setFailure(null);
      reloadDetail();
    } catch (error: unknown) {
      setFailure(error instanceof ApiRequestError ? error.message : UNLINK_ERROR_MESSAGE);
    } finally {
      setLeaving(null);
      setIsUnlinking(false);
    }
  }

  return (
    <>
      <BackToHomes />
      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { md: 'minmax(0, 1fr) auto' },
          alignItems: { md: 'end' },
        }}
      >
        <div>
          <Typography component="h2" variant="h5" sx={{ fontWeight: 700 }}>
            {home.name}
          </Typography>
          <Typography sx={{ color: 'text.secondary', mt: 0.25 }}>
            Responsável: {home.responsible.name}
          </Typography>
        </div>
        {canWrite ? (
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1.25 }}>
            <Button
              variant="outlined"
              disabled={allPeople === null}
              onClick={() => {
                setDialog('edit');
              }}
            >
              Editar casa
            </Button>
            <Button
              variant="contained"
              startIcon={<PlusIcon />}
              disabled={allPeople === null}
              onClick={() => {
                setDialog('link');
              }}
            >
              Adicionar pessoas
            </Button>
          </Stack>
        ) : null}
      </Box>
      {failure === null ? null : <AlertMessage>{failure}</AlertMessage>}
      <Box
        sx={{
          display: { md: 'grid' },
          gridTemplateColumns: { md: 'repeat(2, minmax(0, 1fr))' },
          columnGap: 3,
        }}
      >
        <MemberGroup
          title="Acolhidos"
          members={members.filter((person) => !isStaff(person.role.id))}
          responsibleId={home.responsible.id}
          canWrite={canWrite}
          onRemove={setLeaving}
        />
        <MemberGroup
          title="Equipe"
          members={members.filter((person) => isStaff(person.role.id))}
          responsibleId={home.responsible.id}
          canWrite={canWrite}
          onRemove={setLeaving}
        />
      </Box>

      {dialog === 'edit' && allPeople ? (
        <HomeFormDialog
          home={home}
          memberIds={memberIds}
          people={allPeople}
          onSaved={() => {
            setDialog(null);
            reloadDetail();
            reloadHomes();
          }}
          onDeleted={() => {
            reloadHomes();
            void navigate(HOMES_PATH, { replace: true });
          }}
          onClose={() => {
            setDialog(null);
          }}
        />
      ) : null}
      {dialog === 'link' && allPeople ? (
        <LinkPeopleDialog
          home={home}
          candidates={allPeople.filter(({ id }) => !memberIds.includes(id))}
          onStored={reloadDetail}
          onClose={() => {
            setDialog(null);
          }}
        />
      ) : null}
      {leaving ? (
        <ConfirmDialog
          title="Remover da casa?"
          destructiveLabel={isUnlinking ? 'Removendo...' : 'Remover'}
          keepLabel="Manter"
          isBusy={isUnlinking}
          onConfirm={() => {
            void unlink(leaving);
          }}
          onKeep={() => {
            if (!isUnlinking) setLeaving(null);
          }}
        >
          <strong>{leaving.name}</strong> deixa de aparecer em {home.name}. O cadastro e os
          compromissos continuam.
        </ConfirmDialog>
      ) : null}
    </>
  );
}
