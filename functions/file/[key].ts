import { getFileIdFromKey } from '../utils/common';
import { DBAdapterFactory } from '../utils/db-adapter';

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

// 原有Telegram文件处理逻辑
async function handleTelegramFile(context: any) {
    const { request, env, params } = context;
    const url = new URL(request.url);
    let fileUrl = 'https://telegra.ph/' + url.pathname + url.search;
    
    if (url.pathname.length > 39) { // 路径长度大于39位，说明是Telegram Bot API上传的文件
        const key = url.pathname.split('.')[0].split('/')[2];
        const tgFileId = getFileIdFromKey(key);
        const filePath = await getFilePath(env, tgFileId);
        fileUrl = `https://api.telegram.org/file/bot${env.TG_Bot_Token}/${filePath}`;
    }

    const response = await fetch(fileUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
    });

    // 如果响应是OK，继续进行后续检查
    if (!response.ok) return response;

    // 检查KV存储是否可用
    if (!env.oh_file_url) {
        console.error("KV storage not available");
        return new Response("oh_file_url KV storage not configured", { status: 500 });
    }

    let record = await env.oh_file_url.getWithMetadata(params.id);
    if (!record || !record.metadata) {
        // 如果元数据不存在，初始化它
        console.log("metadata not found, initializing...");
        record = {
            metadata: {}
        };
        await env.oh_file_url.put(params.id, "", { metadata: record.metadata });
    }

    return response;
}

async function getFilePath(env: any, file_id: string) {
    try {
        const url = `https://api.telegram.org/bot${env.TG_Bot_Token}/getFile?file_id=${file_id}`;
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