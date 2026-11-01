import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Stack,
  Typography,
} from '@mui/material';
import { useState } from 'react';

import type { UserAccountListItemResponse } from '@casaecos/shared-types';

import { useApiResource } from '../../../../shared/http/use-api-resource.js';
import { ExpandIcon, PlusIcon } from '../../../../shared/ui/icons.js';
import { LoadingStatus } from '../../../../shared/ui/LoadingStatus.js';
import { LoadError } from '../../../../shared/ui/LoadError.js';
import { Pager } from '../../../../shared/ui/Pager.js';
import { PAGE_SIZES, paginate, type PageSize } from '../../../../shared/ui/pagination.js';
import { RecordList, RecordRow } from '../../../../shared/ui/RecordList.js';
import {
  RECORD_ACTIONS_SX,
  RECORD_CELL_SX,
  RECORD_META_SX,
  RECORD_NAME_SX,
} from '../../../../shared/ui/record-list-sx.js';
import { RoleLabel } from '../../person/components/RoleLabel.js';
import { canHaveAccess, roleGuide } from '../../person/domain/roles.js';
import { personService } from '../../person/services/person-service.js';
import { ChangeRoleDialog } from '../components/ChangeRoleDialog.js';
import { GrantAccessDialog } from '../components/GrantAccessDialog.js';
import { useAuth } from '../context/use-auth.js';
import { authService } from '../services/auth-service.js';

const lastLoginFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function lastLoginText(lastLoginAt: string | null): string {
  return lastLoginAt === null ? 'Nunca entrou' : lastLoginFormat.format(new Date(lastLoginAt));
}

type OpenDialog = { kind: 'grant' } | { kind: 'role'; account: UserAccountListItemResponse };

/** Who logs in and with which role. Only the coordination sees it (`account:manage`). */
export function AccessPage(): React.JSX.Element {
  const auth = useAuth();
  const ownPersonId = auth.status === 'authenticated' ? auth.user.personId : null;
  const accounts = useApiResource('accounts', () => authService.listAccounts());
  const people = useApiResource('people', () => personService.list());
  const roles = useApiResource('roles', () => personService.listRoles());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(PAGE_SIZES[0]);
  const [dialog, setDialog] = useState<OpenDialog | null>(null);

  const roleOptions = roles.resource.status === 'loaded' ? roles.resource.data : [];
  const candidates =
    people.resource.status === 'loaded'
      ? people.resource.data.filter((person) => !person.hasAccount && canHaveAccess(person.role.id))
      : null;

  const reloadAll = (): void => {
    accounts.reload();
    people.reload();
  };

  return (
    <>
      <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 2.5, mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<PlusIcon />}
          disabled={candidates === null}
          onClick={() => {
            setDialog({ kind: 'grant' });
          }}
        >
          Dar acesso
        </Button>
      </Stack>
      <Accordion disableGutters variant="outlined" sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandIcon />}>O que cada papel pode fazer</AccordionSummary>
        <AccordionDetails>
          <Stack component="ul" spacing={1}>
            {roleOptions
              .filter((role) => canHaveAccess(role.id))
              .map((role) => (
                <li key={role.id}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {role.description}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {roleGuide(role.id).access}
                  </Typography>
                </li>
              ))}
          </Stack>
        </AccordionDetails>
      </Accordion>

      {accounts.resource.status === 'failed' ? (
        <LoadError message={accounts.resource.message} onRetry={accounts.reload} />
      ) : accounts.resource.status === 'loading' ? (
        <LoadingStatus>Carregando acessos...</LoadingStatus>
      ) : (
        <AccountList
          accounts={accounts.resource.data}
          ownPersonId={ownPersonId}
          page={page}
          pageSize={pageSize}
          canChangeRole={roles.resource.status === 'loaded'}
          onChangePage={setPage}
          onChangePageSize={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          onChangeRole={(account) => {
            setDialog({ kind: 'role', account });
          }}
        />
      )}

      {dialog?.kind === 'grant' && candidates ? (
        <GrantAccessDialog
          candidates={candidates}
          onStored={reloadAll}
          onClose={() => {
            setDialog(null);
          }}
        />
      ) : null}
      {dialog?.kind === 'role' ? (
        <ChangeRoleDialog
          account={dialog.account}
          roles={roleOptions}
          onStored={reloadAll}
          onClose={() => {
            setDialog(null);
          }}
        />
      ) : null}
    </>
  );
}

interface AccountListProps {
  accounts: readonly UserAccountListItemResponse[];
  ownPersonId: number | null;
  page: number;
  pageSize: PageSize;
  canChangeRole: boolean;
  onChangePage: (page: number) => void;
  onChangePageSize: (pageSize: PageSize) => void;
  onChangeRole: (account: UserAccountListItemResponse) => void;
}

function AccountList({
  accounts,
  ownPersonId,
  page,
  pageSize,
  canChangeRole,
  onChangePage,
  onChangePageSize,
  onChangeRole,
}: AccountListProps): React.JSX.Element {
  const pageWindow = paginate(accounts, page, pageSize);

  return (
    <>
      <RecordList
        columns="minmax(0, 1.3fr) 10rem minmax(0, 1.5fr) 9rem 8.5rem"
        headers={['Nome', 'Papel', 'E-mail', 'Último acesso', '']}
      >
        {pageWindow.items.map((account) => {
          const isOwnAccount = account.person.id === ownPersonId;
          return (
            <li key={account.id}>
              <RecordRow>
                <Box component="span" sx={RECORD_NAME_SX}>
                  {account.person.name}
                </Box>
                <RoleLabel role={account.role} />
                <Box component="span" sx={RECORD_CELL_SX}>
                  {account.email}
                </Box>
                <Box component="span" sx={RECORD_CELL_SX}>
                  {lastLoginText(account.lastLoginAt)}
                </Box>
                <Box component="span" sx={RECORD_META_SX}>
                  {account.email} · {lastLoginText(account.lastLoginAt)}
                </Box>
                <Box component="span" sx={RECORD_ACTIONS_SX}>
                  {/* Changing one's own role could leave the NGO without a coordinator. */}
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={!canChangeRole || isOwnAccount}
                    title={
                      isOwnAccount ? 'Peça a outro coordenador para trocar o seu papel' : undefined
                    }
                    onClick={() => {
                      onChangeRole(account);
                    }}
                  >
                    Trocar papel
                  </Button>
                </Box>
              </RecordRow>
            </li>
          );
        })}
      </RecordList>
      <Pager
        window={pageWindow}
        pageSize={pageSize}
        onChangePage={onChangePage}
        onChangePageSize={onChangePageSize}
      />
    </>
  );
}
