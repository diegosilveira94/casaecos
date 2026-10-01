import { env } from '../../config/env.js';
import { sessionStore } from '../../modules/shared/auth/session-store.js';
import { HttpClient } from './http-client.js';

/** The client every module service uses. */
export const apiClient = new HttpClient(env.apiUrl, sessionStore);
