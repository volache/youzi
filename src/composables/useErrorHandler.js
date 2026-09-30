/**
 * 統一錯誤處理工具模組
 * 提供一致的錯誤處理和日誌記錄功能
 */

/**
 * 安全執行函數，統一錯誤處理
 * @param {Function} fn - 要執行的函數
 * @param {*} defaultValue - 發生錯誤時的預設返回值
 * @param {string} errorContext - 錯誤上下文描述
 * @param {Function} onError - 錯誤回調函數（可選）
 * @returns {*} 函數執行結果或預設值
 */
export function safeExecute(fn, defaultValue = null, errorContext = '操作', onError = null) {
  try {
    return fn()
  } catch (error) {
    const errorMessage = `${errorContext}時發生錯誤`
    console.error(errorMessage + ':', error)

    // 記錄詳細錯誤資訊
    if (error.stack) {
      console.error('錯誤堆疊:', error.stack)
    }

    // 執行錯誤回調
    if (typeof onError === 'function') {
      try {
        onError(error)
      } catch (callbackError) {
        console.error('錯誤回調執行失敗:', callbackError)
      }
    }

    return defaultValue
  }
}

/**
 * 安全的本地儲存操作
 * @param {string} key - 儲存鍵值
 * @param {*} value - 要儲存的值
 * @returns {boolean} 是否儲存成功
 */
export function safeLocalStorageSet(key, value) {
  return safeExecute(
    () => {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    },
    false,
    `儲存資料到 ${key}`
  )
}

/**
 * 安全的本地儲存讀取
 * @param {string} key - 儲存鍵值
 * @param {*} defaultValue - 預設值
 * @returns {*} 讀取的值或預設值
 */
export function safeLocalStorageGet(key, defaultValue = null) {
  return safeExecute(
    () => {
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : defaultValue
    },
    defaultValue,
    `從 ${key} 讀取資料`
  )
}
