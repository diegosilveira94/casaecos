// Fails at startup instead of falling back to a default URL: a silent fallback
// would point a production build at localhost.
function readApiUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL;

  if (!apiUrl) {
    throw new Error('VITE_API_URL não definida no .env da raiz do monorepo');
  }

  return apiUrl.replace(/\/+$/, '');
}

function readGoogleClientId(): string | null {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  if (!clientId) return null;
  return clientId;
}

export const env = {
  apiUrl: readApiUrl(),
  googleClientId: readGoogleClientId(),
};
