import { fail } from "../../utils/common";

export async function onRequestPost(context: any) {
    const { request } = context;
    const { ids: keys } = await request.json();
    if (!keys || !Array.isArray(keys) || keys.length === 0) {
        return fail('Invalid or empty keys array');
    }
    // TODO: 实现批量删除逻辑

}