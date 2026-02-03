import { Hono } from 'hono';
import { listRoutes } from './file/list';
import { rawRoutes } from './file/raw';
import { thumbRoutes } from './file/thumb';
import { metaRoutes } from './file/meta';
import { actionRoutes } from './file/action';
import type { Env } from '../types/hono';

export const fileRoutes = new Hono<{ Bindings: Env }>();

fileRoutes.route('/', listRoutes);
fileRoutes.route('/', rawRoutes);
fileRoutes.route('/', thumbRoutes);
fileRoutes.route('/', metaRoutes);
fileRoutes.route('/', actionRoutes);
