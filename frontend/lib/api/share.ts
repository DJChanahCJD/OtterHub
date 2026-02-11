import { client } from "@/lib/api/client";
import { API_URL, unwrap } from "@/lib/api/config";
import { ShareItem, CreateShareRequest } from "@shared/types";

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
    
    // @ts-ignore - 处理 ApiResponse 格式
    if (result && typeof result === 'object' && 'success' in result && result.success && Array.isArray(result.data)) {
      // @ts-ignore
      return result.data as ShareItem[];
    }
    
    return [];
  },

  /**
   * 创建分享链接
   */
  create: async (data: CreateShareRequest): Promise<{ token: string }> => {
    const res = await client.share.create.$post({
      json: data,
    });

    if (!res.ok) {
      throw new Error("Failed to create share link");
    }

    const result = await res.json();
    
    // @ts-ignore
    if (result.success && result.data) {
        // @ts-ignore
        return result.data;
    }
    
    // @ts-ignore
    if (result.token) {
        // @ts-ignore
        return result as { token: string };
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
    // @ts-ignore
    return result.success === true;
  },

  /**
   * 获取分享元数据
   */
  getMeta: async (token: string) => {
    return unwrap<any>(
      client.share[':token'].meta.$get({
        param: { token },
      })
    );
  },

  /**
   * 获取下载链接
   */
  getDownloadUrl: (token: string) => {
    console.log(`${API_URL}/share/${token}/raw`);
    return `${API_URL}/share/${token}/raw`;
  }
};
