import express, { Request, Response, Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';

const SPEC_FILE = path.join(__dirname, '..', '..', '..', 'docs', 'openapi.json');

const VIEWER_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Presaleee Backend API</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
    <script>
      window.onload = () => SwaggerUIBundle({
        url: window.location.origin + '/docs/openapi.json',
        // Requests go to the origin that served this page, so the Try-it-out
        // buttons follow the backend across the dev and test ports.
        servers: [{ url: window.location.origin }],
        dom_id: '#swagger-ui',
        deepLinking: true,
        tryItOutEnabled: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        plugins: [SwaggerUIBundle.plugins.DownloadUrl],
        layout: 'StandaloneLayout'
      });
    </script>
  </body>
</html>
`;

export function createDocsRouter(): Router {
  const router = express.Router();

  router.get('/', (_req: Request, res: Response) => {
    res.type('html').send(VIEWER_HTML);
  });

  router.get('/openapi.json', (_req: Request, res: Response) => {
    if (!fs.existsSync(SPEC_FILE)) {
      res.status(404).json({
        success: false,
        error: 'docs/openapi.json is missing. Run `npm run docs:openapi` to generate it from docs/openapi.yaml.',
        statusCode: 404
      });
      return;
    }
    // Read per request so a regenerated spec shows up without restarting.
    res.json(JSON.parse(fs.readFileSync(SPEC_FILE, 'utf8')));
  });

  return router;
}
