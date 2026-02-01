import { Hono } from 'hono';
import { FileMetadata, FileTag } from '@shared/types';
import { ok, fail } from '../../../utils/common';
import { DBAdapterFactory } from '../../../utils/db-adapter';
import type { Env } from '../../types/hono';

export const singleUploadRoutes = new Hono<{ Bindings: Env }>();

singleUploadRoutes.post('/', async (c) => {
  try {
    const formData = await c.req.formData();
    const uploadFile = formData.get('file');

    if (!uploadFile || !(uploadFile instanceof File)) {
      return c.json(fail('No file uploaded'), 400);
    }

    const fileName = uploadFile.name.substring(0, 100);
    const fileSize = uploadFile.size;
    const isNsfw = formData.get('nsfw') === 'true';

    const dbAdapter = DBAdapterFactory.getAdapter(c.env);
    const metadata: FileMetadata = {
      fileName,
      fileSize,
      uploadedAt: Date.now(),
      liked: false,
      tags: isNsfw ? [FileTag.NSFW] : [],
    };

    const { key } = await dbAdapter.uploadFile(uploadFile, metadata);
    return c.json(ok(key));
  } catch (error: any) {
    console.error('Upload error:', error);
    return c.json(fail(`Failed to upload file: ${error.message}`), 500);
  }
});
