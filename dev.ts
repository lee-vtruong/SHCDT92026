import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { app } from './server';

const PORT = Number(process.env.PORT) || 3000;

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://localhost:${PORT}`));
} else {
  createViteServer({ server: { middlewareMode: true }, appType: 'spa' }).then((vite) => {
    app.use(vite.middlewares);
    app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://localhost:${PORT}`));
  });
}
