import type { AuthContext } from './context.js';

declare global {
  namespace Express {
    interface Request {
      /** Correlates logs, error responses and upstream calls. */
      requestId: string;
      /** Present only after the authenticate middleware succeeded. */
      auth?: AuthContext;
    }
  }
}

export {};
