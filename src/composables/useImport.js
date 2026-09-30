import { useNotifications } from './useNotifications'
import { useLocalStorage } from './useLocalStorage'

/**
 * CSV 匯入功能模組
 * 專門處理歷史採購紀錄的匯入
 */
export function useImport(dependencies) {
  const { monthlyPostageRecords, stamps } = dependencies
  const {
    alert: showAlert,
    confirm: showConfirm,
    showErrorToast,
    showSuccessToast,
  } = useNotifications()
  const { formatAndValidateMonthInput } = useLocalStorage()

  /**
   * 匯入歷史採購紀錄 CSV
   * @param {File} file - CSV 檔案
   */
  async function importHistoryCSV(file) {
    try {
      // 驗證檔案類型
      if (!validateFileType(file)) {
        await showAlert('請選擇 CSV 檔案（.csv）', '檔案類型錯誤', 'warning')
        return
      }

      // 讀取檔案內容
      const csvContent = await readFileContent(file)

      // 解析 CSV 內容
      const parseResult = parseCSVContent(csvContent)

      if (!parseResult.success) {
        await showAlert(parseResult.error, '檔案格式錯誤', 'error')
        return
      }

      // 顯示匯入預覽
      const confirmed = await showImportPreview(parseResult.data)

      if (confirmed) {
        await processImportData(parseResult.data)
      }
    } catch (error) {
      console.error('匯入 CSV 時發生錯誤:', error)
      await showAlert('匯入失敗，請檢查檔案格式是否正確', '匯入錯誤', 'error')
      showErrorToast('匯入失敗', '請檢查檔案格式')
    }
  }

  /**
   * 驗證檔案類型
   */
  function validateFileType(file) {
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel']
    const allowedExtensions = ['.csv']

    return (
      allowedTypes.includes(file.type) ||
      allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
    )
  }

  /**
   * 讀取檔案內容
   */
  function readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = e => {
        resolve(e.target.result)
      }

      reader.onerror = () => {
        reject(new Error('檔案讀取失敗'))
      }

      reader.readAsText(file, 'UTF-8')
    })
  }

  /**
   * 解析 CSV 內容
   */
  function parseCSVContent(csvContent) {
    try {
      // 移除 BOM 標記
      const cleanContent = csvContent.replace(/^\uFEFF/, '')

      // 分割行
      const lines = cleanContent.split(/\r?\n/).filter(line => line.trim())

      if (lines.length < 2) {
        return { success: false, error: 'CSV 檔案內容不足，至少需要標題行和一行資料' }
      }

      // 解析標題行
      const headers = parseCSVLine(lines[0])

      // 驗證標題格式
      const headerValidation = validateHeaders(headers)
      if (!headerValidation.success) {
        return { success: false, error: headerValidation.error }
      }

      // 解析資料行
      const records = []
      const errors = []

      for (let i = 1; i < lines.length; i++) {
        const lineData = parseCSVLine(lines[i])
        const recordResult = parseDataLine(lineData, headers)

        if (recordResult.success) {
          records.push(recordResult.record)
        } else {
          errors.push(`第 ${i + 1} 行：${recordResult.error}`)
        }
      }

      if (errors.length > 0) {
        return {
          success: false,
          error: `發現 ${errors.length} 個錯誤：\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}`,
        }
      }

      return { success: true, data: records }
    } catch (error) {
      return { success: false, error: `解析錯誤：${error.message}` }
    }
  }

  /**
   * 解析 CSV 行（處理逗號分隔和引號）
   */
  function parseCSVLine(line) {
    const result = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    result.push(current.trim())
    return result
  }

  /**
   * 驗證標題行格式
   */
  function validateHeaders(headers) {
    if (headers.length < 2) {
      return { success: false, error: '標題行格式錯誤，至少需要月份欄位和一個面額欄位' }
    }

    if (headers[0] !== '月份') {
      return { success: false, error: '第一欄必須是「月份」' }
    }

    // 僅接受目前系統支援的面額，避免匯入後資料被靜默忽略。
    const denominationPattern = /^(\d+)元$/
    const supportedDenominations = new Set(stamps.value.map(stamp => stamp.denomination))
    const seenDenominations = new Set()
    for (let i = 1; i < headers.length; i++) {
      const match = headers[i].match(denominationPattern)
      if (!match) {
        return { success: false, error: `欄位「${headers[i]}」格式錯誤，應為「X元」格式` }
      }
      const denomination = Number(match[1])
      if (!supportedDenominations.has(denomination) || seenDenominations.has(denomination)) {
        return { success: false, error: `欄位「${headers[i]}」不是可匯入的有效面額` }
      }
      seenDenominations.add(denomination)
    }

    return { success: true }
  }

  /**
   * 解析資料行
   */
  function parseDataLine(lineData, headers) {
    try {
      if (lineData.length !== headers.length) {
        return {
          success: false,
          error: `欄位數量不符，期望 ${headers.length} 個，實際 ${lineData.length} 個`,
        }
      }

      // 解析月份
      const monthValue = lineData[0]
      const formattedMonth = formatAndValidateMonthInput(monthValue)

      if (!formattedMonth) {
        return {
          success: false,
          error: `月份格式錯誤：「${monthValue}」`,
        }
      }

      // 解析採購數據
      const purchases = Object.fromEntries(stamps.value.map(stamp => [stamp.denomination, 0]))

      for (let i = 1; i < headers.length; i++) {
        const denominationMatch = headers[i].match(/^(\d+)元$/)
        if (denominationMatch) {
          const denomination = parseInt(denominationMatch[1], 10)
          const value = lineData[i]

          // 驗證數值
          const numValue = parseInt(value, 10)
          if (isNaN(numValue) || numValue < 0) {
            return {
              success: false,
              error: `${headers[i]} 的值「${value}」不是有效的非負整數`,
            }
          }

          purchases[denomination] = numValue
        }
      }

      return {
        success: true,
        record: {
          month: formattedMonth,
          purchases: purchases,
        },
      }
    } catch (error) {
      return { success: false, error: `解析錯誤：${error.message}` }
    }
  }

  /**
   * 顯示匯入預覽
   */
  async function showImportPreview(records) {
    const duplicateMonths = findDuplicateMonths(records)
    const newCount = records.length - duplicateMonths.length

    let message = `準備匯入 ${records.length} 筆歷史採購紀錄。\n\n`

    message += `新增月份：${newCount} 筆\n覆蓋既有月份：${duplicateMonths.length} 筆\n\n`

    if (duplicateMonths.length > 0) {
      const previewMonths = duplicateMonths.slice(0, 8).join(', ')
      const omittedCount = duplicateMonths.length - 8
      message += `注意：將覆蓋以下月份：\n${previewMonths}${omittedCount > 0 ? ` 等 ${duplicateMonths.length} 個月份` : ''}\n\n`
      message += '這些月份的現有資料將被覆蓋。\n\n'
    }

    message += '確定要繼續匯入嗎？'

    return await showConfirm(message, '確認匯入', 'warning')
  }

  /**
   * 尋找重複的月份
   */
  function findDuplicateMonths(importRecords) {
    const existingMonths = new Set(monthlyPostageRecords.value.map(r => r.month))
    return importRecords
      .filter(record => existingMonths.has(record.month))
      .map(record => record.month)
  }

  /**
   * 處理匯入資料
   */
  async function processImportData(importRecords) {
    try {
      let addedCount = 0
      let updatedCount = 0

      for (const importRecord of importRecords) {
        const existingIndex = monthlyPostageRecords.value.findIndex(
          r => r.month === importRecord.month
        )

        if (existingIndex !== -1) {
          // 更新現有紀錄
          monthlyPostageRecords.value[existingIndex] = { ...importRecord }
          updatedCount++
        } else {
          // 新增紀錄
          monthlyPostageRecords.value.push({ ...importRecord })
          addedCount++
        }
      }

      // 排序紀錄
      monthlyPostageRecords.value.sort((a, b) => a.month.localeCompare(b.month))

      // 顯示成功訊息
      const message = `匯入完成！\n新增：${addedCount} 筆\n更新：${updatedCount} 筆`
      await showAlert(message, '匯入成功', 'success')
      showSuccessToast('匯入成功', `處理了 ${addedCount + updatedCount} 筆紀錄`)
    } catch (error) {
      console.error('處理匯入資料時發生錯誤:', error)
      await showAlert('匯入過程中發生錯誤，請重試', '匯入失敗', 'error')
      showErrorToast('匯入失敗', '處理資料時發生錯誤')
    }
  }

  return {
    importHistoryCSV,
  }
}
