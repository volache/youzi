import { ref } from 'vue'
import { safeLocalStorageGet, safeLocalStorageSet } from './useErrorHandler'

/**
 * 組合偏好管理模組
 * 負責管理使用者對郵票組合的偏好設定
 */

const STORAGE_KEYS = {
  COMBINATION_USAGE: 'postage_combination_usage',
  COMBINATION_FAVORITES: 'postage_combination_favorites',
}

/**
 * 載入組合使用統計
 * @returns {Object} 使用統計物件
 */
function loadCombinationUsage() {
  return safeLocalStorageGet(STORAGE_KEYS.COMBINATION_USAGE, {})
}

/**
 * 儲存組合使用統計
 * @param {Object} usageData - 使用統計資料
 */
function saveCombinationUsage(usageData) {
  safeLocalStorageSet(STORAGE_KEYS.COMBINATION_USAGE, usageData)
}

/**
 * 載入組合最愛設定
 * @returns {Object} 最愛設定物件
 */
function loadCombinationFavorites() {
  return safeLocalStorageGet(STORAGE_KEYS.COMBINATION_FAVORITES, {})
}

/**
 * 儲存組合最愛設定
 * @param {Object} favoritesData - 最愛設定資料
 */
function saveCombinationFavorites(favoritesData) {
  safeLocalStorageSet(STORAGE_KEYS.COMBINATION_FAVORITES, favoritesData)
}

/**
 * 產生組合識別鍵
 * @param {Array} stamps - 郵票面額陣列
 * @param {number} postageAmount - 郵資金額
 * @returns {string} 組合識別鍵
 */
function generateCombinationKey(stamps, postageAmount) {
  const sortedStamps = stamps.slice().sort((a, b) => b - a)
  return `${postageAmount}_${sortedStamps.join(',')}`
}

/**
 * 組合偏好管理 Composable
 */
export function useCombinationPreferences() {
  const combinationUsage = ref(loadCombinationUsage())
  const combinationFavorites = ref(loadCombinationFavorites())

  /**
   * 記錄組合使用次數
   * @param {string} combinationKey - 組合識別鍵
   */
  function recordCombinationUsage(combinationKey) {
    try {
      const currentUsage = { ...combinationUsage.value }
      currentUsage[combinationKey] = (currentUsage[combinationKey] || 0) + 1
      combinationUsage.value = currentUsage
      saveCombinationUsage(currentUsage)
    } catch (error) {
      console.error('記錄組合使用次數失敗:', error)
    }
  }

  /**
   * 切換組合最愛狀態
   * @param {string} combinationKey - 組合識別鍵
   */
  function toggleCombinationFavorite(combinationKey) {
    try {
      const currentFavorites = { ...combinationFavorites.value }

      if (currentFavorites[combinationKey]) {
        delete currentFavorites[combinationKey]
      } else {
        currentFavorites[combinationKey] = true
      }

      combinationFavorites.value = currentFavorites
      saveCombinationFavorites(currentFavorites)
    } catch (error) {
      console.error('切換最愛狀態失敗:', error)
    }
  }

  /**
   * 取得組合統計資訊
   * @returns {Object} 統計資訊
   */
  function getCombinationStats() {
    try {
      const totalUsage = Object.values(combinationUsage.value).reduce(
        (sum, count) => sum + count,
        0
      )
      const totalFavorites = Object.keys(combinationFavorites.value).length
      const mostUsedCombination = Object.entries(combinationUsage.value).sort(
        ([, a], [, b]) => b - a
      )[0]

      return {
        totalUsage,
        totalFavorites,
        mostUsedCombination: mostUsedCombination
          ? {
              key: mostUsedCombination[0],
              count: mostUsedCombination[1],
            }
          : null,
      }
    } catch (error) {
      console.error('取得組合統計失敗:', error)
      return {
        totalUsage: 0,
        totalFavorites: 0,
        mostUsedCombination: null,
      }
    }
  }

  /**
   * 清除當前郵資的所有組合偏好
   * @param {number} postageAmount - 郵資金額
   */
  function clearCurrentPostagePreferences(postageAmount) {
    if (postageAmount === null) return

    try {
      const currentPostagePrefix = `${postageAmount}_`

      const currentUsage = { ...combinationUsage.value }
      const currentFavorites = { ...combinationFavorites.value }

      Object.keys(currentUsage).forEach(key => {
        if (key.startsWith(currentPostagePrefix)) {
          delete currentUsage[key]
        }
      })

      Object.keys(currentFavorites).forEach(key => {
        if (key.startsWith(currentPostagePrefix)) {
          delete currentFavorites[key]
        }
      })

      combinationUsage.value = currentUsage
      combinationFavorites.value = currentFavorites

      saveCombinationUsage(currentUsage)
      saveCombinationFavorites(currentFavorites)
    } catch (error) {
      console.error('清除當前郵資偏好失敗:', error)
    }
  }

  /**
   * 清除所有組合偏好資料
   */
  function clearAllPreferences() {
    try {
      combinationUsage.value = {}
      combinationFavorites.value = {}

      saveCombinationUsage({})
      saveCombinationFavorites({})
    } catch (error) {
      console.error('清除所有偏好失敗:', error)
    }
  }

  return {
    combinationUsage,
    combinationFavorites,
    recordCombinationUsage,
    toggleCombinationFavorite,
    getCombinationStats,
    clearCurrentPostagePreferences,
    clearAllPreferences,
    generateCombinationKey,
  }
}
