import { corsMiddleware } from './middleware/cors';
import { authRoutes } from './routes/auth';
import { settingsRoutes } from './routes/settings';
import { fileRoutes } from './routes/file';
import { healthRoutes } from './routes/health';
import { wallpaperRoutes } from './routes/wallpaper';
import { uploadRoutes } from './routes/upload';
import { trashRoutes } from './routes/trash';
import { proxyRoutes } from './routes/proxy';
import { musicRoutes } from './routes/music';
import { shareRoutes } from './routes/share';
import { Hono } from 'hono';
import type { Env } from './types/hono';

export const app = new Hono<{
  Bindings: Env;
}>().basePath('');

// Global Middleware
app.use('*', corsMiddleware);

// Routes
app.route('/file', fileRoutes);

app.route('/auth', authRoutes);
app.route('/settings', settingsRoutes);
app.route('/health', healthRoutes);
app.route('/wallpaper', wallpaperRoutes);
app.route('/upload', uploadRoutes);
app.route('/trash', trashRoutes);
app.route('/proxy', proxyRoutes);
app.route('/music-api', musicRoutes);
app.route('/share', shareRoutes);

// Export AppType for RPC
export type AppType = typeof app;
