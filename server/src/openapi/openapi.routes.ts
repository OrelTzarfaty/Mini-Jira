import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';

import { createOpenApiSpec } from './spec.js';

export function createOpenApiRouter(): Router {
  const router = Router();
  const spec = createOpenApiSpec();

  router.get('/openapi.json', (_req, res) => {
    res.json(spec);
  });

  router.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));

  return router;
}
