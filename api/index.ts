import type { Request, Response } from 'express';

let appPromise: Promise<typeof import('../server.js').default> | null = null;

export default async function handler(req: Request, res: Response) {
  try {
    appPromise ??= import('../server.js').then((module) => module.default);
    const app = await appPromise;
    return app(req, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('API bootstrap failed:', error);
    return res.status(500).json({
      success: false,
      error: 'API_BOOTSTRAP_FAILED',
      message,
    });
  }
}
