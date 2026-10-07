import http from 'http';
import { createApp } from './app';
import { initSocketServer } from './sockets/server';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/prisma';

async function bootstrap() {
  const app = createApp();
  const httpServer = http.createServer(app);

  initSocketServer(httpServer);

  await prisma.$connect();
  logger.info('Connected to PostgreSQL via Prisma');

  httpServer.listen(env.PORT, () => {
    logger.info(`🚀 Server running on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`📚 API docs available at http://localhost:${env.PORT}/api-docs`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    httpServer.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  logger.error(`Failed to start server: ${err.message}`);
  process.exit(1);
});
