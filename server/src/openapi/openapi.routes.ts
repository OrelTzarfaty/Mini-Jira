import { Router } from 'express';

import { createOpenApiSpec } from './spec.js';

export function createOpenApiRouter(): Router {
  const router = Router();
  const spec = createOpenApiSpec();

  router.get('/openapi.json', (_req, res) => {
    res.json(spec);
  });

  return router;
}
