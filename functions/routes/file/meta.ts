import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import {
  FileMetadata,
  FileTag,
  MAX_FILENAME_LENGTH,
  MAX_DESC_LENGTH,
} from "@shared/types";
import { authMiddleware } from "../../middleware/auth";
import type { Env } from "../../types/hono";
import { fail, ok } from "@utils/response";

export const metaRoutes = new Hono<{ Bindings: Env }>();

metaRoutes.patch(
  "/:key/meta",
  authMiddleware,
  zValidator(
    "json",
    z.object({
      fileName: z.string().min(1).max(MAX_FILENAME_LENGTH).optional(),
      tags: z.array(z.enum(FileTag)).optional(),
      desc: z.string().max(MAX_DESC_LENGTH).optional(),
    })
  ),
  async (c) => {
    const key = c.req.param("key");
    const { fileName, tags, desc } = c.req.valid("json");
    const kv = c.env.oh_file_url_demo;

    try {
      const { value, metadata } = await kv.getWithMetadata<FileMetadata>(key);

      if (!metadata) {
        return fail(c, `File metadata not found for key: ${key}`, 404);
      }

      if (fileName !== undefined) metadata.fileName = fileName;
      if (tags !== undefined) metadata.tags = tags;
      if (desc !== undefined) metadata.desc = desc;

      await kv.put(key, value, { metadata });

      return ok(c, metadata);
    } catch (e: any) {
      console.error("Update metadata error:", e);
      return fail(c, `Failed to update metadata: ${e.message}`);
    }
  }
);
