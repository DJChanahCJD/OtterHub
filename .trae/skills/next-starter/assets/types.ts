// 统一API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}