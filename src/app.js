import Fastify from 'fastify';
import tasksRoutes from './routes/tasks.js';

export function buildApp(options = {}) {
  const app = Fastify({
    ...options,
    ajv: { customOptions: { coerceTypes: false, removeAdditional: false } },
  });

  app.get('/health', async () => ({
    status: 'quebrado',
    application: 'devops-tasks-api',
  }));
  app.register(tasksRoutes);
  return app;
}
