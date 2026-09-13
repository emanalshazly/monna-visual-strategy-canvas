process.env.AI_PROVIDER = 'fake';
process.env.NODE_ENV = 'test';
await import('../server-dist/server/index.js');
