import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';

import type { HomeResponse, PersonResponse } from '@casaecos/shared-types';

import { ApiRequestError } from '../../../../shared/http/api-request-error.js';
import { useApiResource } from '../../../../shared/http/use-api-resource.js';
import { AlertMessage } from '../../../../shared/ui/AlertMessage.js';
import { ConfirmDialog } from '../../../../shared/ui/ConfirmDialog.js';
import { ChevronLeftIcon, PlusIcon } from '../../../../shared/ui/icons.js';
import { LoadError } from '../../../../shared/ui/LoadError.js';
import { useAuth } from '../../auth/context/use-auth.js';
import { RoleLabel } from '../../person/components/RoleLabel.js';
import { isStaff } from '../../person/domain/roles.js';
import { personService } from '../../person/services/person-service.js';
import { HomeFormDialog } from '../components/HomeFormDialog.js';
import { LinkPeopleDialog } from '../components/LinkPeopleDialog.js';
import { useHomeSelection } from '../context/use-home-selection.js';
import { HOMES_PATH } from '../home-paths.js';
import { homeService } from '../services/home-service.js';

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
    <section className="member-group">
      <h3>
        {title} <span className="tab-count">{members.length}</span>
      </h3>
      {members.length === 0 ? (
        <p className="form-field__hint">Ninguém vinculado ainda.</p>
      ) : (
        <ul className="member-list">
          {members.map((person) => {
            const isResponsible = person.id === responsibleId;
            return (
              <li key={person.id} className="member-row">
                <span className="member-row__name">
                  {person.name}
                  {isResponsible ? (
                    <span className="member-row__responsible"> · responsável</span>
                  ) : null}
                </span>
                <RoleLabel role={person.role} />
                {canWrite ? (
                  <button
                    className="text-button"
                    type="button"
                    disabled={isResponsible}
                    title={isResponsible ? 'Troque o responsável antes de remover' : undefined}
                    aria-label={`Remover ${person.name} da casa`}
                    onClick={() => {
                      onRemove(person);
                    }}
                  >
                    Remover
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
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
        <Link className="back-link" to={HOMES_PATH}>
          <ChevronLeftIcon />
          Casas
        </Link>
        {detail.resource.status === 'failed' ? (
          <LoadError message={detail.resource.message} onRetry={detail.reload} />
        ) : (
          <p className="day-events__status" role="status">
            <span className="spinner spinner--primary spinner--small" aria-hidden="true" />
            Carregando casa...
          </p>
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
      <Link className="back-link" to={HOMES_PATH}>
        <ChevronLeftIcon />
        Casas
      </Link>
      <div className="home-detail__heading">
        <div>
          <h2>{home.name}</h2>
          <p>Responsável: {home.responsible.name}</p>
        </div>
        {canWrite ? (
          <div className="home-detail__actions">
            <button
              className="outline-button"
              type="button"
              disabled={allPeople === null}
              onClick={() => {
                setDialog('edit');
              }}
            >
              Editar casa
            </button>
            <button
              className="primary-button primary-button--compact"
              type="button"
              disabled={allPeople === null}
              onClick={() => {
                setDialog('link');
              }}
            >
              <PlusIcon />
              Adicionar pessoas
            </button>
          </div>
        ) : null}
      </div>
      {failure === null ? null : <AlertMessage>{failure}</AlertMessage>}
      <div className="member-groups">
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
      </div>

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
