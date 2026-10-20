import type { Server } from 'node:http';
import { createApp } from './app.js';
import { EnvValidationError, loadEnv } from './config/env.js';
import { createLogger } from './config/logger.js';
import { createContainer } from './container.js';

function bootstrap(): void {
  let env;
  try {
    env = loadEnv();
  } catch (error) {
    // Refuse to boot with missing/invalid configuration. Logged as plain
    // stderr because the logger itself depends on configuration.
    const message =
      error instanceof EnvValidationError ? error.message : 'Failed to load configuration';
    process.stderr.write(`${message}\n`);
    process.exit(1);
  }

  const logger = createLogger(env.LOG_LEVEL, env.NODE_ENV === 'development');
  const container = createContainer(env, logger);
  const app = createApp(container.deps);

  const server: Server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'api listening');
  });

  // Keep-alive must outlive the load balancer's idle timeout (typically 60s),
  // otherwise the LB may reuse a socket we just closed and return 502s.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
  server.requestTimeout = 30_000;

  let stopping = false;
  const shutdown = (signal: string): void => {
    if (stopping) return;
    stopping = true;
    logger.info({ signal }, 'shutdown started: draining connections');

    // 1. /ready now returns 503 so the load balancer stops sending traffic.
    container.lifecycle.shuttingDown = true;

    // 2. Stop accepting connections; finish in-flight requests.
    server.close((error) => {
      if (error) logger.error({ err: error }, 'error while closing server');
      void container.close().finally(() => {
        logger.info('shutdown complete');
        process.exit(error ? 1 : 0);
      });
    });
    server.closeIdleConnections();

    // 3. Hard deadline so a stuck request cannot block a deploy forever.
    setTimeout(() => {
      logger.error('shutdown timed out: forcing exit');
      process.exit(1);
    }, env.SHUTDOWN_TIMEOUT_MS).unref();
  };

  process.on('SIGTERM', () => {
    shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    shutdown('SIGINT');
  });
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'unhandled promise rejection');
  });
  process.on('uncaughtException', (error) => {
    // State may be corrupt: log and exit; the orchestrator restarts us.
    logger.fatal({ err: error }, 'uncaught exception');
    process.exit(1);
  });
}

bootstrap();
