import { getFileIdFromKey } from '../utils/common';
import { DBAdapterFactory } from '../utils/db-adapter';
import { CF } from '../utils/types';

export async function onRequest(context: any) {
    const { request, env, params } = context;
    const key = params.key;

    try {
        // 创建存储适配器实例
        const dbAdapter = DBAdapterFactory.getAdapter(env);

        // 尝试从存储适配器获取文件
        const fileResponse = await dbAdapter.get(key);
        if (fileResponse) {
            // 如果存储适配器返回了文件响应，直接返回
            return fileResponse;
        }

        // 如果存储适配器没有返回文件响应（例如Telegram存储），使用原有逻辑
        return await handleTelegramFile(context);
    } catch (error: any) {
        console.error('File access error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// Telegram Bot API 文件处理逻辑
// 原Telegraph API: 'https://telegra.ph/' + url.pathname + url.search;
async function handleTelegramFile(context: any) {
    const { request, env, params } = context;
    const url = new URL(request.url);
    
    const key = url.pathname.split('.')[0].split('/')[2];
    const tgFileId = getFileIdFromKey(key);
    const filePath = await getFilePath(env, tgFileId);
    const fileUrl = `https://api.telegram.org/file/bot${env.TG_Bot_Token}/${filePath}`;

    const response = await fetch(fileUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
    });

    // 如果响应是OK，继续进行后续检查
    if (!response.ok) return response;

    // 检查KV存储是否可用
    if (!env[CF.KV_NAME]) {
        console.error("KV storage not available");
        return new Response("oh_file_url KV storage not configured", { status: 500 });
    }

    let record = await env[CF.KV_NAME].getWithMetadata(params.key);
    if (!record || !record.metadata) {
        // 如果元数据不存在，初始化它
        console.log("metadata not found, initializing...");
        record = {
            metadata: {}
        };
        await env[CF.KV_NAME].put(params.key, "", { metadata: record.metadata });
    }

    return response;
}

async function getFilePath(env: any, fileId: string) {
    try {
        const url = `https://api.telegram.org/bot${env.TG_Bot_Token}/getFile?file_id=${fileId}`;
        const res = await fetch(url, {
            method: 'GET',
        });

        if (!res.ok) {
            console.error(`HTTP error! status: ${res.status}`);
            return null;
        }

        const responseData = await res.json();
        const { ok, result } = responseData;

        if (ok && result) {
            return result.file_path;
        } else {
            console.error('Error in response data:', responseData);
            return null;
        }
    } catch (error: any) {
        console.error('Error fetching file path:', error.message);
        return null;
    }
}