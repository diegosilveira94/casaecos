import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

import type { HomeResponse } from '@casaecos/shared-types';

import { useApiResource } from '../../../../shared/http/use-api-resource.js';
import { BuildingIcon, PlusIcon } from '../../../../shared/ui/icons.js';
import { LoadError } from '../../../../shared/ui/LoadError.js';
import { useAuth } from '../../auth/context/use-auth.js';
import { isStaff } from '../../person/domain/roles.js';
import { personService } from '../../person/services/person-service.js';
import { HomeFormDialog } from '../components/HomeFormDialog.js';
import { useHomeSelection } from '../context/use-home-selection.js';
import { homeDetailPath } from '../home-paths.js';
import { useHomeMemberships } from '../hooks/use-home-memberships.js';

/** The homes of the NGO, with who answers for each and how many live and work there. */
export function HomesPage(): React.JSX.Element {
  const { can } = useAuth();
  const canWrite = can('home:write');
  const navigate = useNavigate();
  const { reloadHomes } = useHomeSelection();
  const { memberships, reload } = useHomeMemberships();
  const people = useApiResource('people', () => personService.list());
  const [isCreating, setIsCreating] = useState(false);

  const showCreatedHome = (home: HomeResponse): void => {
    reloadHomes();
    void navigate(homeDetailPath(home.id));
  };

  return (
    <>
      {canWrite ? (
        <div className="list-toolbar list-toolbar--single">
          <button
            className="primary-button primary-button--compact"
            type="button"
            disabled={people.resource.status !== 'loaded'}
            onClick={() => {
              setIsCreating(true);
            }}
          >
            <PlusIcon />
            Nova casa
          </button>
        </div>
      ) : null}

      {memberships.status === 'failed' ? (
        <LoadError message={memberships.message} onRetry={reload} />
      ) : memberships.status === 'loading' ? (
        <p className="day-events__status" role="status">
          <span className="spinner spinner--primary spinner--small" aria-hidden="true" />
          Carregando casas...
        </p>
      ) : memberships.data.homes.length === 0 ? (
        <div className="empty-state">
          <strong>Nenhuma casa cadastrada.</strong>
          Cadastre a primeira casa e depois vincule as pessoas que moram e trabalham nela.
        </div>
      ) : (
        <div className="home-cards">
          {memberships.data.homes.map((home) => {
            const members = memberships.data.peopleOf(home.id);
            const staffCount = members.filter((person) => isStaff(person.role.id)).length;
            return (
              <Link key={home.id} className="home-card" to={homeDetailPath(home.id)}>
                <div className="home-card__top">
                  <span className="home-card__icon">
                    <BuildingIcon />
                  </span>
                  <div>
                    <h3>{home.name}</h3>
                    <p className="home-card__responsible">Responsável: {home.responsible.name}</p>
                  </div>
                </div>
                <dl className="home-card__counts">
                  <div>
                    <dt>Acolhidos</dt>
                    <dd>{members.length - staffCount}</dd>
                  </div>
                  <div>
                    <dt>Equipe</dt>
                    <dd>{staffCount}</dd>
                  </div>
                </dl>
              </Link>
            );
          })}
        </div>
      )}

      {isCreating && people.resource.status === 'loaded' ? (
        <HomeFormDialog
          home={null}
          memberIds={[]}
          people={people.resource.data}
          onSaved={showCreatedHome}
          onDeleted={reload}
          onClose={() => {
            setIsCreating(false);
          }}
        />
      ) : null}
    </>
  );
}
