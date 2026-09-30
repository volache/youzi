import { safeExecute } from './useErrorHandler'

/**
 * 通用工具函數模組
 * 提供數值格式化、輸入清理等常用功能
 */
export function useUtils() {
  /**
   * 數值格式化顯示
   * 整數不顯示小數點，非整數顯示兩位小數
   * @param {number|string} value - 要格式化的數值
   * @returns {string} 格式化後的字串
   */
  const formatNumber = value => {
    return safeExecute(
      () => {
        if (typeof value !== 'number') {
          value = parseFloat(value) || 0
        }
        if (Number.isInteger(value)) {
          return value.toLocaleString('en-US')
        }
        return value.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      },
      '0',
      '數值格式化'
    )
  }

  /**
   * 月份顯示格式化
   * 將 YYYY-MM 格式轉換為 YYYY 年 MM 月
   * @param {string} monthValue - 月份字串 (YYYY-MM)
   * @returns {string} 格式化後的月份顯示
   */
  const formatMonthDisplay = monthValue => {
    return safeExecute(
      () => {
        if (
          !monthValue ||
          typeof monthValue !== 'string' ||
          monthValue.length !== 7 ||
          monthValue.indexOf('-') === -1
        ) {
          return monthValue
        }
        const [year, month] = monthValue.split('-')
        return `${year} 年 ${month} 月`
      },
      monthValue,
      '月份格式化'
    )
  }

  /**
   * 清理整數輸入
   * 確保輸入值為非負整數
   * @param {Object} targetObject - 目標物件
   * @param {string} fieldName - 欄位名稱
   * @param {Event} inputEvent - 輸入事件
   */
  const sanitizeIntegerInput = (targetObject, fieldName, inputEvent) => {
    safeExecute(
      () => {
        const inputValue = inputEvent.target.value
        if (inputValue === '') {
          targetObject[fieldName] = 0
        } else {
          let parsedValue = parseInt(inputValue, 10)
          if (isNaN(parsedValue) || parsedValue < 0) parsedValue = 0
          if (parsedValue.toString() !== inputValue && inputValue !== '0') {
            inputEvent.target.value = parsedValue
          }
          targetObject[fieldName] = parsedValue
        }
      },
      null,
      '整數輸入清理'
    )
  }

  /**
   * 清理比例輸入
   * 確保輸入值為非負浮點數，保留兩位小數
   * @param {Object} proportionObject - 比例物件
   * @param {Event} inputEvent - 輸入事件
   */
  const sanitizeProportionInput = (proportionObject, inputEvent) => {
    safeExecute(
      () => {
        const inputValue = inputEvent.target.value
        const parsedValue = parseFloat(inputValue)
        if (isNaN(parsedValue) || parsedValue < 0) {
          proportionObject.proportion = 0
          inputEvent.target.value = '0.00'
        } else {
          proportionObject.proportion = parseFloat(parsedValue.toFixed(2))
          inputEvent.target.value = proportionObject.proportion.toFixed(2)
        }
      },
      null,
      '比例輸入清理'
    )
  }

  /**
   * 清理歷史紀錄輸入
   * 確保採購數量為非負整數
   * @param {Object} historyRecord - 歷史紀錄物件
   * @param {number} denomination - 郵票面額
   * @param {Event} inputEvent - 輸入事件
   */
  const sanitizeHistoryInput = (historyRecord, denomination, inputEvent) => {
    safeExecute(
      () => {
        const inputValue = inputEvent.target.value
        if (inputValue === '') {
          historyRecord.purchases[denomination] = 0
        } else {
          let parsedValue = parseInt(inputValue, 10)
          if (isNaN(parsedValue) || parsedValue < 0) parsedValue = 0
          if (parsedValue.toString() !== inputValue && inputValue !== '0') {
            inputEvent.target.value = parsedValue
          }
          historyRecord.purchases[denomination] = parsedValue
        }
      },
      null,
      '歷史紀錄輸入清理'
    )
  }

  return {
    formatNumber,
    formatMonthDisplay,
    sanitizeIntegerInput,
    sanitizeProportionInput,
    sanitizeHistoryInput,
  }
}
