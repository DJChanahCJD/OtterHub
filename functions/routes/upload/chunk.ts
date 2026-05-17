import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import {
  FileType,
  FileTag,
  MAX_FILENAME_LENGTH,
  MAX_CHUNK_NUM,
} from "@shared/types";
import type { Env } from "../../types/hono";
import { fail } from "@utils/response";

export const chunkUploadRoutes = new Hono<{ Bindings: Env }>();

// 演示站不支持分片上传
chunkUploadRoutes.post(
  "/chunk/init",
  zValidator(
    "json",
    z.object({
      fileType: z.enum(FileType),
      fileName: z.string().min(1).max(MAX_FILENAME_LENGTH),
      fileSize: z.number().int().positive(),
      totalChunks: z.number().int().positive(),
      tags: z.array(z.enum(FileTag)).optional(),
    })
  ),
  async (c) => {
    return fail(c, "演示站不支持分片上传", 400);
  }
);

chunkUploadRoutes.get(
  "/chunk/progress",
  zValidator(
    "query",
    z.object({
      key: z.string().min(1),
    })
  ),
  async (c) => {
    return fail(c, "演示站不支持分片上传", 400);
  }
);

// 上传分片
chunkUploadRoutes.post("/chunk", async (c) => {
  return fail(c, "演示站不支持分片上传", 400);
});
