import { DBAdapterFactory } from '../utils/db-adapter';
import { FileMetadata } from '../utils/types';
import { ok, fail } from '../utils/common';

export async function onRequestPost(context: any) {
    const { request, env } = context;

    try {
        const clonedRequest = request.clone();
        const formData = await clonedRequest.formData();

        const uploadFile = formData.get('file');
        if (!uploadFile) {
            return fail('No file uploaded', 400);
        }

        const fileName = uploadFile.name;
        const fileSize = uploadFile.size;

        // 创建存储适配器实例
        const dbAdapter = DBAdapterFactory.getAdapter(env);

        const metadata : FileMetadata = {
            fileName,
            fileSize,
            uploadedAt: Date.now(),
            liked: false,
        }

        // console.log('Uploading file:', fileName, fileSize);
        return await dbAdapter.upload(uploadFile, metadata);
    } catch (error: any) {
        console.error('Upload error:', error);
        return fail(`Failed to upload file: ${error.message}`, 500);
    }
}