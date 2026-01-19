// types/index.ts

export * from "./wallpaper";
export * from "./music";
export * from "./const";
export * from "./file";

// 统一API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}