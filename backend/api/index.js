// Vercel Function entry point. Vercel runs the API as a function, so there is
// no app.listen() and no SIGTERM drain here (see src/server.ts for Docker/Render).
// It imports the compiled output: `npm run build` runs before functions are bundled.
import { createApp } from '../dist/app.js';
import { loadEnv } from '../dist/config/env.js';
import { createLogger } from '../dist/config/logger.js';
import { createContainer } from '../dist/container.js';

const env = loadEnv();
const logger = createLogger(env.LOG_LEVEL);
const container = createContainer(env, logger);

export default createApp(container.deps);
