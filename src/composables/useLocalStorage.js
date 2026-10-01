import { safeExecute, safeLocalStorageGet, safeLocalStorageSet } from './useErrorHandler.js'
import {
  getPreservedPurchaseCount,
  normalizePurchaseCount,
  normalizePurchaseMode,
} from './purchasePlanning.js'

/**
 * 本地儲存管理模組
 * 負責資料的持久化儲存與讀取，包含月份格式化與驗證功能
 */

const CONFIG = {
  STORAGE_KEY: 'postageCalculatorData',
  BACKUP_STORAGE_KEY: 'postageCalculatorData.backup',
  SCHEMA_VERSION: 3,
  DEBOUNCE_DELAY: 500,
  ROC_BASE_YEAR: 1911,
  MAX_FUTURE_YEARS: 10,
  MONTH_VALIDATION: {
    MIN: 1,
    MAX: 12,
  },
}

/**
 * 節流函數，用於限制函數的呼叫頻率
 * @param {Function} func - 要節流的函數
 * @param {number} delay - 延遲時間（毫秒）
 * @returns {Function} 節流後的函數
 */
function debounce(func, delay) {
  let timeout
  return function (...args) {
    const context = this
    clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(context, args), delay)
  }
}

/**
 * 月份輸入格式化並校正為 YYYY-MM
 * 支援多種輸入格式：114年6月、2025年6月、114/6、2025-06 等
 * @param {string} input - 輸入的月份字串
 * @returns {string} 格式化後的 YYYY-MM 字串，無效時返回空字串
 */
function formatAndValidateMonthInput(input) {
  return safeExecute(
    () => {
      if (!input || typeof input !== 'string') {
        return ''
      }

      input = input.trim()

      const result = parseMonthInput(input)
      if (!result) {
        return ''
      }

      const { year, month } = result

      if (!isValidMonth(month) || !isValidYear(year)) {
        return ''
      }

      return formatYearMonth(year, month)
    },
    '',
    '格式化月份輸入'
  )
}

/**
 * 解析月份輸入的各種格式
 * 支援格式：202506、11307、114.5、2024.11、2025年6月、114年6月、YYYY/MM、YYYY-MM
 * @param {string} input - 輸入字串
 * @returns {Object|null} 包含年月的物件或 null
 */
function parseMonthInput(input) {
  // 匹配格式：YYYY年MM月、114年6月等
  const explicitMatch = input.match(/^(?:(\d{2,4})年|(\d{2,4})[/-])?(\d{1,2})月?$/)

  if (explicitMatch) {
    return parseExplicitFormat(explicitMatch)
  }

  // 匹配格式：YYYY/MM、YYYY-MM
  const bareMatch = input.match(/^(\d{2,4})[/-](\d{1,2})$/)
  if (bareMatch) {
    return parseBareFormat(bareMatch)
  }

  // 匹配格式：YYYY.MM、114.5、2024.11
  const dotMatch = input.match(/^(\d{2,4})\.(\d{1,2})$/)
  if (dotMatch) {
    return parseDotFormat(dotMatch)
  }

  // 匹配格式：YYYYMM、202506、11307
  const compactMatch = input.match(/^(\d{4,6})$/)
  if (compactMatch) {
    return parseCompactFormat(compactMatch[1])
  }

  return null
}

/**
 * 解析明確格式的年月
 * @param {Array} match - 正則匹配結果
 * @returns {Object} 年月物件
 */
function parseExplicitFormat(match) {
  const yearPart = match[1] || match[2]
  const month = parseInt(match[3], 10)

  let year
  if (yearPart) {
    year = convertToWesternYear(parseInt(yearPart, 10))
  } else {
    year = new Date().getFullYear()
  }

  return { year, month }
}

/**
 * 解析基本格式的年月
 * @param {Array} match - 正則匹配結果
 * @returns {Object} 年月物件
 */
function parseBareFormat(match) {
  const yearPart = match[1]
  const month = parseInt(match[2], 10)
  const year = convertToWesternYear(parseInt(yearPart, 10))

  return { year, month }
}

/**
 * 解析點號格式的年月（YYYY.MM、114.5）
 * @param {Array} match - 正則匹配結果
 * @returns {Object} 年月物件
 */
function parseDotFormat(match) {
  const yearPart = match[1]
  const month = parseInt(match[2], 10)
  const year = convertToWesternYear(parseInt(yearPart, 10))

  return { year, month }
}

/**
 * 解析緊湊格式的年月（YYYYMM、202506、11307）
 * @param {string} input - 輸入字串
 * @returns {Object|null} 年月物件或 null
 */
function parseCompactFormat(input) {
  const length = input.length

  if (length === 6) {
    // YYYYMM 格式（如：202506）
    const year = parseInt(input.substring(0, 4), 10)
    const month = parseInt(input.substring(4, 6), 10)
    return { year, month }
  } else if (length === 5) {
    // YYYMMM 格式（如：11307）- 民國年 + 月份
    const year = parseInt(input.substring(0, 3), 10)
    const month = parseInt(input.substring(3, 5), 10)
    const westernYear = convertToWesternYear(year)
    return { year: westernYear, month }
  } else if (length === 4) {
    // YYMM 格式（如：2406）- 假設為民國年
    const year = parseInt(input.substring(0, 2), 10)
    const month = parseInt(input.substring(2, 4), 10)
    const westernYear = convertToWesternYear(year)
    return { year: westernYear, month }
  }

  return null
}

/**
 * 轉換為西元年份
 * @param {number} year - 輸入年份
 * @returns {number} 西元年份
 */
function convertToWesternYear(year) {
  if (year <= 999) {
    return year + CONFIG.ROC_BASE_YEAR
  }
  return year
}

/**
 * 驗證月份是否有效
 * @param {number} month - 月份
 * @returns {boolean} 是否有效
 */
function isValidMonth(month) {
  return (
    !isNaN(month) && month >= CONFIG.MONTH_VALIDATION.MIN && month <= CONFIG.MONTH_VALIDATION.MAX
  )
}

/**
 * 驗證年份是否有效
 * @param {number} year - 年份
 * @returns {boolean} 是否有效
 */
function isValidYear(year) {
  const currentWesternYear = new Date().getFullYear()
  return (
    !isNaN(year) &&
    year >= CONFIG.ROC_BASE_YEAR &&
    year <= currentWesternYear + CONFIG.MAX_FUTURE_YEARS
  )
}

/**
 * 格式化年月為 YYYY-MM
 * @param {number} year - 年份
 * @param {number} month - 月份
 * @returns {string} 格式化字串
 */
function formatYearMonth(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`
}

/**
 * 本地儲存管理模組
 * 提供數據的儲存、載入和格式化功能
 */
export function useLocalStorage() {
  /**
   * 儲存數據到 LocalStorage（帶節流）
   * @param {Object} data - 要儲存的數據
   */
  const saveDataToLocalStorage = debounce(data => {
    const dataToSave = sanitizeDataForStorage(data)
    const previousData = safeLocalStorageGet(CONFIG.STORAGE_KEY)
    if (previousData) {
      safeLocalStorageSet(CONFIG.BACKUP_STORAGE_KEY, previousData)
    }
    safeLocalStorageSet(CONFIG.STORAGE_KEY, dataToSave)
  }, CONFIG.DEBOUNCE_DELAY)

  /**
   * 清理數據以供儲存
   * @param {Object} data - 原始數據
   * @returns {Object} 清理後的數據
   */
  function sanitizeDataForStorage(data) {
    return safeExecute(
      () => {
        // 驗證必要欄位
        if (!data || typeof data !== 'object') {
          throw new Error('無效的資料物件')
        }

        return {
          schemaVersion: CONFIG.SCHEMA_VERSION,
          // 不儲存 statisticsDate，因為我們希望始終使用今日日期
          monthlyBudget: validateAndSanitizeNumber(data.monthlyBudget, 0, 0, 1000000),
          stamps: sanitizeStampsData(data.stamps || []),
          idealProportions: sanitizeProportionsData(data.idealProportions || []),
          monthlyPostageRecords: sanitizeRecordsData(data.monthlyPostageRecords || []),
          currentRuleMode: validateRuleMode(data.currentRuleMode),
          reportData: sanitizeReportData(data.reportData),
          mailRecords: sanitizeMailRecords(data.mailRecords || []),
          stampInventoryTransactions: sanitizeInventoryTransactions(
            data.stampInventoryTransactions || []
          ),
        }
      },
      {},
      '清理儲存資料'
    )
  }

  /**
   * 驗證並清理數字
   */
  function validateAndSanitizeNumber(value, defaultValue, min = -Infinity, max = Infinity) {
    const num = Number(value)
    if (isNaN(num) || num < min || num > max) {
      return defaultValue
    }
    return num
  }

  /**
   * 驗證規則模式
   */
  function validateRuleMode(mode) {
    const validModes = ['custom', 'dynamic']
    const legacyModes = { hardcoded: 'custom', historical: 'dynamic' }
    return validModes.includes(mode) ? mode : legacyModes[mode] || 'custom'
  }

  /**
   * 報告只來自系統計算結果；以 JSON 複製隔離 Vue 響應式物件與無法序列化的內容。
   */
  function sanitizeReportData(reportData) {
    if (!reportData || typeof reportData !== 'object' || Array.isArray(reportData)) return null

    try {
      return JSON.parse(JSON.stringify(reportData))
    } catch {
      return null
    }
  }

  /**
   * 清理紀錄資料
   */
  function sanitizeRecordsData(records) {
    if (!Array.isArray(records)) return []

    return records
      .filter(record => {
        return (
          record &&
          typeof record === 'object' &&
          typeof record.month === 'string' &&
          record.month.match(/^\d{4}-\d{2}$/) &&
          typeof record.purchases === 'object'
        )
      })
      .map(record => ({
        month: record.month,
        purchases: sanitizePurchasesData(record.purchases),
      }))
  }

  function sanitizeMailRecords(records) {
    if (!Array.isArray(records)) return []
    return records
      .filter(record => record && typeof record === 'object' && typeof record.id === 'string')
      .map(record => ({
        id: record.id,
        status:
          record.status === 'draft'
            ? 'pending'
            : record.status === 'void'
              ? 'cancelled'
              : ['pending', 'sent', 'cancelled'].includes(record.status)
                ? record.status
                : 'pending',
        sentDate: typeof record.sentDate === 'string' ? record.sentDate.slice(0, 10) : '',
        sender: String(record.sender || '').slice(0, 200),
        referenceNumber: String(record.referenceNumber || '').slice(0, 200),
        recipient: String(record.recipient || '').slice(0, 200),
        recipientAddress: String(record.recipientAddress || '').slice(0, 500),
        mailType: String(record.mailType || '').slice(0, 80),
        weight: Number.isFinite(Number(record.weight)) ? Number(record.weight) : null,
        postage: Math.max(0, Number(record.postage) || 0),
        trackingNumber: String(record.trackingNumber || '').slice(0, 100),
        stampCombination: sanitizeStampCombination(record.stampCombination),
        notes: String(record.notes || '').slice(0, 1000),
        createdAt: typeof record.createdAt === 'string' ? record.createdAt : '',
        confirmedAt: typeof record.confirmedAt === 'string' ? record.confirmedAt : '',
        cancelledAt: typeof record.cancelledAt === 'string' ? record.cancelledAt : '',
        cancellationReason: String(record.cancellationReason || '').slice(0, 500),
        stockReturned: Boolean(record.stockReturned),
      }))
  }

  function sanitizeInventoryTransactions(transactions) {
    if (!Array.isArray(transactions)) return []
    return transactions
      .filter(item => item && typeof item === 'object' && typeof item.id === 'string')
      .map(item => ({
        id: item.id,
        recordId: String(item.recordId || ''),
        occurredAt: typeof item.occurredAt === 'string' ? item.occurredAt : '',
        type: ['mailing_debit', 'mailing_credit'].includes(item.type) ? item.type : 'mailing_debit',
        combination: sanitizeStampCombination(item.combination),
      }))
  }

  function sanitizeStampCombination(combination) {
    if (!Array.isArray(combination)) return []
    return combination
      .map(item => ({
        denomination: Math.floor(Number(item?.denomination)),
        count: Math.floor(Number(item?.count)),
      }))
      .filter(item => item.denomination > 0 && item.count > 0)
  }

  /**
   * 清理採購資料
   */
  function sanitizePurchasesData(purchases) {
    if (!purchases || typeof purchases !== 'object') return {}

    const sanitized = {}
    Object.entries(purchases).forEach(([key, value]) => {
      const num = parseInt(key, 10)
      const count = parseInt(value, 10)
      if (!isNaN(num) && num > 0 && !isNaN(count) && count >= 0) {
        sanitized[num] = count
      }
    })
    return sanitized
  }

  /**
   * 清理郵票數據
   * @param {Array} stamps - 郵票數據陣列
   * @returns {Array} 清理後的郵票數據
   */
  function sanitizeStampsData(stamps) {
    if (!Array.isArray(stamps)) return []

    return stamps
      .filter(stamp => {
        return (
          stamp &&
          typeof stamp === 'object' &&
          typeof stamp.denomination === 'number' &&
          stamp.denomination > 0
        )
      })
      .map(stamp => {
        const purchaseMode = normalizePurchaseMode(stamp.purchaseMode)
        const fixedPurchaseCount = getPreservedPurchaseCount({ ...stamp, purchaseMode })

        return {
          denomination: parseInt(stamp.denomination, 10),
          remainingCount: normalizePurchaseCount(stamp.remainingCount),
          remainingLocked: Boolean(stamp.remainingLocked),
          purchaseCount:
            purchaseMode === 'fixed'
              ? fixedPurchaseCount
              : normalizePurchaseCount(stamp.purchaseCount),
          purchaseMode,
          fixedPurchaseCount,
          minStock: normalizePurchaseCount(stamp.minStock, 10000),
          priority: validateAndSanitizeNumber(stamp.priority, 999, 1, 999),
        }
      })
  }

  /**
   * 清理比例數據
   * @param {Array} proportions - 比例數據陣列
   * @returns {Array} 清理後的比例數據
   */
  function sanitizeProportionsData(proportions) {
    if (!Array.isArray(proportions)) return []

    return proportions
      .filter(proportion => {
        return (
          proportion &&
          typeof proportion === 'object' &&
          typeof proportion.denomination === 'number' &&
          proportion.denomination > 0 &&
          typeof proportion.proportion === 'number' &&
          proportion.proportion >= 0
        )
      })
      .map(proportion => ({
        denomination: parseInt(proportion.denomination, 10),
        proportion: Math.max(0, Math.min(100, parseFloat(proportion.proportion.toFixed(2)))),
      }))
  }

  /**
   * 從 LocalStorage 載入數據
   * @returns {Object|null} 載入的數據或 null
   */
  function loadDataFromLocalStorage() {
    return safeExecute(
      () => {
        const parsedData = safeLocalStorageGet(CONFIG.STORAGE_KEY)
        if (!parsedData) {
          return null
        }

        return processLoadedData(parsedData)
      },
      null,
      '載入本地儲存數據'
    )
  }

  /**
   * 處理載入的數據
   * @param {Object} data - 解析後的數據
   * @returns {Object} 處理後的數據
   */
  function processLoadedData(data) {
    const sanitizedData = sanitizeDataForStorage(migrateData(data))

    if (Array.isArray(sanitizedData.monthlyPostageRecords)) {
      sanitizedData.monthlyPostageRecords = formatMonthlyRecords(
        sanitizedData.monthlyPostageRecords
      )
    }

    return sanitizedData
  }

  /**
   * 集中處理舊版欄位，避免版本升級後各元件各自猜測資料格式。
   */
  function migrateData(data) {
    if (!data || typeof data !== 'object') return {}

    return {
      ...data,
      schemaVersion: Number.isInteger(data.schemaVersion) ? data.schemaVersion : 1,
    }
  }

  /**
   * 格式化月度紀錄中的月份數據
   * @param {Array} records - 月度紀錄陣列
   * @returns {Array} 格式化後的紀錄
   */
  function formatMonthlyRecords(records) {
    return records
      .map(record => ({
        ...record,
        month: formatAndValidateMonthInput(record.month),
      }))
      .filter(record => record.month)
  }

  return {
    saveDataToLocalStorage,
    loadDataFromLocalStorage,
    sanitizeDataForStorage,
    formatAndValidateMonthInput,
  }
}
