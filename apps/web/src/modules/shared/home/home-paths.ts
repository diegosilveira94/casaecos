export const HOMES_PATH = '/settings/homes';

export function homeDetailPath(homeId: number): string {
  return `${HOMES_PATH}/${String(homeId)}`;
}
