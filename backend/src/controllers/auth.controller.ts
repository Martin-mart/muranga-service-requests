import type { Request, Response } from 'express';
import { requireAuth } from '../middleware/authenticate.js';
import type { AuthService } from '../services/auth.service.js';
import { parseOrThrow } from '../utils/validate.js';
import { registerSchema } from '../validators/auth.validators.js';

export function createAuthController(service: AuthService) {
  return {
    register: async (req: Request, res: Response): Promise<void> => {
      const input = parseOrThrow(registerSchema, req.body);
      await service.register(input);
      // 202: the account is usable only after email confirmation.
      res.status(202).json({
        data: {
          message:
            'If this email can be registered, a confirmation link has been sent. Please check your inbox.',
        },
      });
    },

    me: (req: Request, res: Response): void => {
      res.json({ data: service.me(requireAuth(req).user) });
    },
  };
}
