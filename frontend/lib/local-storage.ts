// utils/local-storage.ts
// 统一管理localStorage操作

// 存储键名常量
export const STORAGE_KEYS = {
  ACTIVE_TYPE: 'otterhub_active_type',
  VIEW_MODE: 'otterhub_view_mode',
  SORT_TYPE: 'otterhub_sort_type',
  SORT_ORDER: 'otterhub_sort_order',
  SAFE_MODE: 'otterhub_safe_mode',
} as const;

/**
 * 从localStorage获取数据
 * @param key 存储键名
 * @param defaultValue 默认值
 * @returns 存储的数据或默认值
 */
export const getFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    // 检查是否在浏览器环境中
    if (typeof window === 'undefined') {
      return defaultValue;
    }
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return defaultValue;
  }
};

/**
 * 向localStorage写入数据
 * @param key 存储键名
 * @param value 要存储的数据
 */
export const setToStorage = <T>(key: string, value: T): void => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error writing to localStorage:', error);
  }
};

/**
 * 从localStorage删除数据
 * @param key 存储键名
 */
export const removeFromStorage = (key: string): void => {
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
};

/**
 * 清空localStorage
 */
export const clearStorage = (): void => {
  try {
    window.localStorage.clear();
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
};
