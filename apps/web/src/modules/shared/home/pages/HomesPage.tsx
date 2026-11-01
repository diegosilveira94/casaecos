import { Avatar, Box, Button, Card, CardActionArea, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

import type { HomeResponse } from '@casaecos/shared-types';

import { useApiResource } from '../../../../shared/http/use-api-resource.js';
import { BuildingIcon, PlusIcon } from '../../../../shared/ui/icons.js';
import { EmptyState } from '../../../../shared/ui/EmptyState.js';
import { LoadError } from '../../../../shared/ui/LoadError.js';
import { LoadingStatus } from '../../../../shared/ui/LoadingStatus.js';
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
        <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 2.5, mb: 2 }}>
          <Button
            variant="contained"
            startIcon={<PlusIcon />}
            disabled={people.resource.status !== 'loaded'}
            onClick={() => {
              setIsCreating(true);
            }}
          >
            Nova casa
          </Button>
        </Stack>
      ) : null}

      {memberships.status === 'failed' ? (
        <LoadError message={memberships.message} onRetry={reload} />
      ) : memberships.status === 'loading' ? (
        <LoadingStatus>Carregando casas...</LoadingStatus>
      ) : memberships.data.homes.length === 0 ? (
        <EmptyState title="Nenhuma casa cadastrada.">
          Cadastre a primeira casa e depois vincule as pessoas que moram e trabalham nela.
        </EmptyState>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { md: 'repeat(auto-fill, minmax(17rem, 1fr))' },
          }}
        >
          {memberships.data.homes.map((home) => {
            const members = memberships.data.peopleOf(home.id);
            const staffCount = members.filter((person) => isStaff(person.role.id)).length;
            return (
              <Card key={home.id} variant="outlined">
                <CardActionArea
                  component={Link}
                  to={homeDetailPath(home.id)}
                  sx={{ display: 'block', p: 2 }}
                >
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                      <BuildingIcon />
                    </Avatar>
                    <div>
                      <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {home.name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Responsável: {home.responsible.name}
                      </Typography>
                    </div>
                  </Stack>
                  <Stack
                    component="dl"
                    direction="row"
                    spacing={2}
                    sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}
                  >
                    <Stack direction="row" spacing={0.5}>
                      <Typography component="dt" variant="body2" sx={{ color: 'text.secondary' }}>
                        Acolhidos
                      </Typography>
                      <Typography component="dd" variant="body2" sx={{ fontWeight: 600 }}>
                        {members.length - staffCount}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.5}>
                      <Typography component="dt" variant="body2" sx={{ color: 'text.secondary' }}>
                        Equipe
                      </Typography>
                      <Typography component="dd" variant="body2" sx={{ fontWeight: 600 }}>
                        {staffCount}
                      </Typography>
                    </Stack>
                  </Stack>
                </CardActionArea>
              </Card>
            );
          })}
        </Box>
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
