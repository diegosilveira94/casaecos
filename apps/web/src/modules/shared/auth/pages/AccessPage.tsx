import { useState } from 'react';

import type { UserAccountListItemResponse } from '@casaecos/shared-types';

import { useApiResource } from '../../../../shared/http/use-api-resource.js';
import { PlusIcon } from '../../../../shared/ui/icons.js';
import { LoadError } from '../../../../shared/ui/LoadError.js';
import { Pager } from '../../../../shared/ui/Pager.js';
import { PAGE_SIZES, paginate, type PageSize } from '../../../../shared/ui/pagination.js';
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
      <div className="list-toolbar list-toolbar--single">
        <button
          className="primary-button primary-button--compact"
          type="button"
          disabled={candidates === null}
          onClick={() => {
            setDialog({ kind: 'grant' });
          }}
        >
          <PlusIcon />
          Dar acesso
        </button>
      </div>
      <details className="permissions-help">
        <summary>O que cada papel pode fazer</summary>
        <ul className="permission-list">
          {roleOptions
            .filter((role) => canHaveAccess(role.id))
            .map((role) => (
              <li key={role.id}>
                <strong>{role.description}</strong>
                <span>{roleGuide(role.id).access}</span>
              </li>
            ))}
        </ul>
      </details>

      {accounts.resource.status === 'failed' ? (
        <LoadError message={accounts.resource.message} onRetry={accounts.reload} />
      ) : accounts.resource.status === 'loading' ? (
        <p className="day-events__status" role="status">
          <span className="spinner spinner--primary spinner--small" aria-hidden="true" />
          Carregando acessos...
        </p>
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
      <ul className="record-list access-columns">
        <li className="record-list__header" aria-hidden="true">
          <span>Nome</span>
          <span>Papel</span>
          <span>E-mail</span>
          <span>Último acesso</span>
          <span />
        </li>
        {pageWindow.items.map((account) => {
          const isOwnAccount = account.person.id === ownPersonId;
          return (
            <li key={account.id}>
              <div className="record-row">
                <span className="record-row__name">{account.person.name}</span>
                <RoleLabel role={account.role} />
                <span className="record-row__cell--desktop">{account.email}</span>
                <span className="record-row__cell--desktop">
                  {lastLoginText(account.lastLoginAt)}
                </span>
                <span className="record-row__meta">
                  {account.email} · {lastLoginText(account.lastLoginAt)}
                </span>
                <span className="record-row__actions">
                  {/* Changing one's own role could leave the NGO without a coordinator. */}
                  <button
                    className="outline-button"
                    type="button"
                    disabled={!canChangeRole || isOwnAccount}
                    title={
                      isOwnAccount ? 'Peça a outro coordenador para trocar o seu papel' : undefined
                    }
                    onClick={() => {
                      onChangeRole(account);
                    }}
                  >
                    Trocar papel
                  </button>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <Pager
        window={pageWindow}
        pageSize={pageSize}
        onChangePage={onChangePage}
        onChangePageSize={onChangePageSize}
      />
    </>
  );
}
