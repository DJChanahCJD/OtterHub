import { client } from "@/lib/api/client";
import { API_URL, unwrap } from "@/lib/api/config";
import { ShareItem, CreateShareRequest, ShareMetaResponse } from "@shared/types";

export const shareApi = {
  /**
   * 获取所有分享链接列表
   */
  list: async (): Promise<ShareItem[]> => {
    const res = await client.share.list.$get();

    if (!res.ok) {
      throw new Error("Failed to fetch shares");
    }

    const result = await res.json();

    // 兼容不同的返回格式
    if (Array.isArray(result)) {
      return result as ShareItem[];
    }

    // 处理 ApiResponse 格式
    if (result && typeof result === 'object' && 'success' in result && result.success && Array.isArray(result.data)) {
      return result.data as ShareItem[];
    }

    return [];
  },

  /**
   * 创建分享链接
   * 支持单文件分享和打包分享
   */
  create: async (data: CreateShareRequest): Promise<{ token: string; fileCount?: number }> => {
    const res = await client.share.create.$post({
      json: data,
    });

    if (!res.ok) {
      throw new Error("Failed to create share link");
    }

    const result = await res.json();

    if (result.success && result.data) {
      return result.data;
    }

    if (result.token) {
      return result as { token: string; fileCount?: number };
    }

    throw new Error("Invalid response format");
  },

  /**
   * 撤销分享链接
   */
  revoke: async (token: string): Promise<boolean> => {
    const res = await client.share.revoke[':token'].$delete({
      param: { token },
    });

    if (!res.ok) {
      throw new Error("Failed to revoke link");
    }

    const result = await res.json();

    return result.success === true;
  },

  /**
   * 获取分享元数据
   */
  getMeta: async (token: string): Promise<ShareMetaResponse> => {
    return unwrap<ShareMetaResponse>(
      client.share[':token'].meta.$get({
        param: { token },
      })
    );
  },

  /**
   * 获取下载链接
   * @param token 分享 token
   * @param fileKey 打包分享时指定文件 key
   */
  getDownloadUrl: (token: string, fileKey?: string) => {
    const baseUrl = `${API_URL}/share/${token}/raw`;
    if (fileKey) {
      return `${baseUrl}?file=${encodeURIComponent(fileKey)}`;
    }
    return baseUrl;
  },

  /**
   * 获取打包下载链接（ZIP）
   */
  getDownloadAllUrl: (token: string) => {
    return `${API_URL}/share/${token}/download-all`;
  }
};
