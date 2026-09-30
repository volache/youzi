/**
 * 歷史紀錄管理模組
 * 負責月度採購紀錄的新增、編輯、刪除和驗證功能
 */
import { useNotifications } from './useNotifications'

export function useHistoryManagement(dependencies) {
  const {
    monthlyPostageRecords,
    currentRecord,
    editingRecord,
    stamps,
    formatAndValidateMonthInput,
  } = dependencies

  // 引入通知系統
  const {
    alert: showAlert,
    confirm: showConfirm,
    showErrorToast,
    showSuccessToast,
  } = useNotifications()

  // === 輸入處理 ===

  /**
   * 處理月份輸入失焦事件
   * 自動格式化並驗證月份輸入
   */
  function handleMonthInputBlur() {
    try {
      currentRecord.value.month = formatAndValidateMonthInput(currentRecord.value.month)
    } catch (error) {
      console.error('處理月份輸入時發生錯誤:', error)
      currentRecord.value.month = ''
    }
  }

  /**
   * 更新 currentRecord 的月份
   */
  function updateCurrentRecordMonth(value) {
    try {
      currentRecord.value.month = value
    } catch (error) {
      console.error('更新月份時發生錯誤:', error)
    }
  }

  /**
   * 更新 currentRecord 的採購數量
   */
  function updateCurrentRecordPurchase(denomination, value) {
    try {
      const numValue = Number(value)
      if (isNaN(numValue) || numValue < 0) {
        currentRecord.value.purchases[denomination] = 0
      } else {
        currentRecord.value.purchases[denomination] = Math.floor(numValue)
      }
    } catch (error) {
      console.error('更新採購數量時發生錯誤:', error)
      currentRecord.value.purchases[denomination] = 0
    }
  }

  // === 編輯功能 ===

  /**
   * 開始編輯歷史紀錄
   * 將現有紀錄載入到編輯表單中
   */
  function startEditHistory(record) {
    try {
      if (!record) {
        console.error('無效的紀錄物件')
        return
      }

      editingRecord.value = record
      currentRecord.value = {
        month: formatAndValidateMonthInput(record.month),
        purchases: JSON.parse(JSON.stringify(record.purchases)),
      }

      // 確保所有面額都有對應的採購數據
      ensureAllDenominationsExist()
    } catch (error) {
      console.error('開始編輯歷史紀錄時發生錯誤:', error)
      cancelEditAddHistory()
    }
  }

  /**
   * 取消編輯或新增操作
   * 重設表單狀態
   */
  function cancelEditAddHistory() {
    try {
      editingRecord.value = null
      currentRecord.value = { month: '', purchases: {} }
    } catch (error) {
      console.error('取消編輯時發生錯誤:', error)
      // 強制重設
      editingRecord.value = null
      currentRecord.value = { month: '', purchases: {} }
    }
  }

  // === 儲存功能 ===

  /**
   * 儲存歷史紀錄
   * 驗證輸入並更新或新增紀錄
   */
  async function saveHistoryRecord() {
    try {
      // 驗證月份格式
      const validationError = validateMonthInput()
      if (validationError) {
        await showAlert(validationError, '輸入錯誤', 'warning')
        return
      }

      // 檢查重複月份
      const duplicateError = checkForDuplicateMonth()
      if (duplicateError) {
        await showAlert(duplicateError, '重複月份', 'warning')
        return
      }

      // 執行儲存操作
      if (editingRecord.value) {
        updateExistingRecord()
        showSuccessToast('更新成功', '歷史紀錄已更新')
      } else {
        addNewRecord()
        showSuccessToast('新增成功', '歷史紀錄已新增')
      }

      // 排序並清理表單
      sortRecordsByMonth()
      cancelEditAddHistory()
    } catch (error) {
      console.error('儲存歷史紀錄時發生錯誤:', error)
      await showAlert('儲存失敗，請重試。', '儲存錯誤', 'error')
      showErrorToast('儲存失敗', '請檢查輸入內容後重試')
    }
  }

  // === 刪除功能 ===

  /**
   * 刪除歷史紀錄
   * 顯示確認對話框並執行刪除
   */
  async function deleteHistoryRecord(index) {
    try {
      // 驗證索引有效性
      if (!isValidIndex(index)) {
        console.error('無效的紀錄索引:', index)
        return
      }

      const record = monthlyPostageRecords.value[index]
      const displayMonth = formatMonthForDisplay(record.month)

      const confirmed = await showConfirm(
        `確定要刪除 ${displayMonth} 的紀錄嗎？此操作無法復原。`,
        '確認刪除',
        'warning'
      )

      if (confirmed) {
        monthlyPostageRecords.value.splice(index, 1)
        showSuccessToast('刪除成功', `${displayMonth} 的紀錄已刪除`)
      }
    } catch (error) {
      console.error('刪除歷史紀錄時發生錯誤:', error)
      await showAlert('刪除失敗，請重試。', '刪除錯誤', 'error')
      showErrorToast('刪除失敗', '請重試')
    }
  }

  // === 驗證函數 ===

  /**
   * 驗證月份輸入
   */
  function validateMonthInput() {
    const formattedMonth = formatAndValidateMonthInput(currentRecord.value.month)
    if (!formattedMonth) {
      return '請輸入有效月份格式！\n支援格式：202506、11307、114.5、2024.11、2025年6月、114年6月'
    }

    currentRecord.value.month = formattedMonth
    return null
  }

  /**
   * 檢查重複月份
   */
  function checkForDuplicateMonth() {
    const existingIndex = monthlyPostageRecords.value.findIndex(
      r => r.month === currentRecord.value.month
    )

    if (editingRecord.value) {
      // 編輯模式：檢查是否與其他紀錄重複
      const editingIndex = monthlyPostageRecords.value.indexOf(editingRecord.value)
      if (existingIndex !== -1 && existingIndex !== editingIndex) {
        return '此月份已存在其他記錄，請修改月份名稱或檢查。'
      }
    } else {
      // 新增模式：檢查是否已存在
      if (existingIndex !== -1) {
        return '此月份記錄已存在，請使用編輯功能。'
      }
    }

    return null
  }

  /**
   * 驗證索引有效性
   */
  function isValidIndex(index) {
    return typeof index === 'number' && index >= 0 && index < monthlyPostageRecords.value.length
  }

  // === 工具函數 ===

  /**
   * 確保所有面額都存在於採購數據中
   */
  function ensureAllDenominationsExist() {
    stamps.value.forEach(stamp => {
      if (currentRecord.value.purchases[stamp.denomination] === undefined) {
        currentRecord.value.purchases[stamp.denomination] = 0
      }
    })
  }

  /**
   * 更新現有紀錄
   */
  function updateExistingRecord() {
    const recordIndex = monthlyPostageRecords.value.indexOf(editingRecord.value)
    if (recordIndex !== -1) {
      monthlyPostageRecords.value[recordIndex] = { ...currentRecord.value }
    } else {
      throw new Error('找不到要更新的紀錄')
    }
  }

  /**
   * 新增新紀錄
   */
  function addNewRecord() {
    monthlyPostageRecords.value.push({ ...currentRecord.value })
  }

  /**
   * 按月份排序紀錄
   */
  function sortRecordsByMonth() {
    monthlyPostageRecords.value.sort((a, b) => a.month.localeCompare(b.month))
  }

  /**
   * 格式化月份用於顯示
   */
  function formatMonthForDisplay(monthValue) {
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
  }

  // === 返回值 ===
  return {
    // 主要功能
    saveHistoryRecord,
    startEditHistory,
    deleteHistoryRecord,
    cancelEditAddHistory,

    // 輸入處理
    handleMonthInputBlur,
    updateCurrentRecordMonth,
    updateCurrentRecordPurchase,
  }
}
