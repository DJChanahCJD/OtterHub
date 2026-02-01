import { Hono } from 'hono';
import { singleUploadRoutes } from './upload/single';
import { urlUploadRoutes } from './upload/url';
import { chunkUploadRoutes } from './upload/chunk';
import { authMiddleware } from '../middleware/auth';
import type { Env } from '../types/hono';

export const uploadRoutes = new Hono<{ Bindings: Env }>();

// 所有上传接口都需要认证
uploadRoutes.use('*', authMiddleware);

uploadRoutes.route('/', singleUploadRoutes);
uploadRoutes.route('/', urlUploadRoutes);
uploadRoutes.route('/', chunkUploadRoutes);
