import { FileMetadata } from '../utils/common';
import { DBAdapterFactory } from '../utils/db-adapter';

export async function onRequestPost(context: any) {
    const { request, env } = context;

    try {
        const clonedRequest = request.clone();
        const formData = await clonedRequest.formData();

        const uploadFile = formData.get('file');
        if (!uploadFile) {
            throw new Error('No file uploaded');
        }

        const fileName = uploadFile.name;
        const fileSize = uploadFile.size;

        // 创建存储适配器实例
        const dbAdapter = DBAdapterFactory.getAdapter(env);

        const metadata : FileMetadata = {
            fileName,
            fileSize,
            uploadTime: Date.now(),
        }

        // 上传文件
        const key = await dbAdapter.upload(uploadFile, metadata);

        return new Response(
            JSON.stringify([{ 'src': `/file/${key}` }]),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    } catch (error: any) {
        console.error('Upload error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}