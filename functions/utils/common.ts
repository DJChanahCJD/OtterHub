// utils/common.ts

// 判断是否为开发环境
export function isDev(env: any): boolean {
  const isDev = !env?.TG_BOT_TOKEN;
  return isDev;
}

/**
 * 编码 Content-Disposition header 中的文件名（支持中文等非 ASCII 字符）
 * 使用 RFC 5987 标准：filename*=UTF-8''<percent-encodedfilename>
 */
export function encodeContentDisposition(fileName: string, inline = true): string {
  const disposition = inline ? 'inline' : 'attachment';
  // 使用 RFC 5987 编码：filename*=UTF-8''<percent-encoded>
  const encodedFileName = encodeURIComponent(fileName)
    .replace(/['()]/g, escape) // 额外转义特殊字符
    .replace(/\*/g, '%2A');
  return `${disposition}; filename*=UTF-8''${encodedFileName}`;
}
