// Fails at startup instead of falling back to a default URL: a silent fallback
// would point a production build at localhost.
function readApiUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL;

  if (!apiUrl) {
    throw new Error('VITE_API_URL não definida no .env da raiz do monorepo');
  }

  return apiUrl.replace(/\/+$/, '');
}

export const env = {
  apiUrl: readApiUrl(),
};
