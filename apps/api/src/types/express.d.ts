import type { AuthTokenPayload } from '@casaecos/shared-types';

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthTokenPayload;
  }
}
