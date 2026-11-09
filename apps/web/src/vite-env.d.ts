// Optional on purpose: config/env.ts is where a missing value turns into an error.
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}
