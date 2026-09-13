import path from 'node:path';
import fastifyStatic from '@fastify/static';
import { buildApp } from './app.js';
import { createProvider } from './providers/provider-factory.js';

const app = buildApp({ provider: createProvider() });
const projectRoot = process.cwd();
await app.register(fastifyStatic, { root: path.join(projectRoot, 'dist') });
app.setNotFoundHandler((request, reply) => {
  if (request.method === 'GET' && !request.url.startsWith('/api/')) return reply.sendFile('index.html');
  return reply.code(404).send({ code: 'not_found' });
});

await app.listen({ host: process.env.HOST || '0.0.0.0', port: Number(process.env.PORT || 3001) });
