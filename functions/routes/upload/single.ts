import { Hono } from 'hono';
import { FileMetadata, FileTag, MAX_FILENAME_LENGTH } from '@shared/types';
import { DBAdapterFactory } from '@utils/db-adapter';
import type { Env } from '../../types/hono';
import { fail, ok } from '@utils/response';

export const singleUploadRoutes = new Hono<{ Bindings: Env }>();

singleUploadRoutes.post('/', async (c) => {
  try {
    const formData = await c.req.formData();
    const uploadFile = formData.get('file');

    if (!uploadFile || !(uploadFile instanceof File)) {
      return fail(c, 'No file uploaded', 400);
    }

    const fileName = uploadFile.name.substring(0, MAX_FILENAME_LENGTH);
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
    return ok(c, key);
  } catch (error: any) {
    console.error('Upload error:', error);
    return fail(c, `Failed to upload file: ${error.message}`, 500);
  }
});
