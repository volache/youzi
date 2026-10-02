import { ref, computed, watch, onMounted } from 'vue'
import { useLocalStorage } from './useLocalStorage'
import { useOptimalPurchases } from './useOptimalPurchases'
import { useNotifications } from './useNotifications'
import { useMailRecords } from './useMailRecords'
import { safeExecute } from './useErrorHandler'
import { getPreservedPurchaseCount, normalizePurchaseMode } from './purchasePlanning'
import {
  APP_DEFAULTS,
  createDefaultIdealProportions,
  createDefaultStamps,
} from '../config/stampCatalog'

// === 常數定義 ===
const CONFIG = {
  MIN_STOCK_BUFFER_FACTOR: 1.2,
}

export function usePostageCalculator() {
  const { saveDataToLocalStorage, loadDataFromLocalStorage } = useLocalStorage()
  const defaultStamps = createDefaultStamps()
  const defaultIdealProportions = createDefaultIdealProportions()
  const {
    alert: showAlert,
    showSuccessToast,
    showWarningToast,
    showErrorToast,
  } = useNotifications()

  // === 響應式數據 ===
  // 基本設定
  const statisticsDate = ref('')
  const monthlyBudget = ref(APP_DEFAULTS.monthlyBudget)

  // 郵票與設定數據
  const stamps = ref([])
  const idealProportions = ref([])

  // UI 狀態管理
  const modalStates = {
    showAdvancedSettingsModal: ref(false),
    showReportModal: ref(false),
    showHistoryModal: ref(false),
    showPostageCombinatorModal: ref(false),
    showExportOptionsModal: ref(false),
  }

  // 報告與紀錄數據
  const reportData = ref(null)
  const monthlyPostageRecords = ref([])
  const currentRecord = ref({ month: '', purchases: {}, notes: '' })
  const editingRecord = ref(null)
  const currentRuleMode = ref('custom') // 預設為自定義模式
  const mailRecordState = useMailRecords({ stamps })

  // === 計算屬性 ===
  const stampStatistics = {
    totalRemainingCount: computed(() => calculateTotalByProperty('remainingCount')),

    totalRemainingValue: computed(() => calculateTotalValue('remainingCount')),

    totalPlannedPurchaseCount: computed(() => calculateTotalByProperty('purchaseCount')),

    totalPlannedPurchaseValue: computed(() => calculateTotalValue('purchaseCount')),

    totalStampCount: computed(
      () =>
        stampStatistics.totalRemainingCount.value + stampStatistics.totalPlannedPurchaseCount.value
    ),

    totalStampValue: computed(
      () =>
        stampStatistics.totalRemainingValue.value + stampStatistics.totalPlannedPurchaseValue.value
    ),
  }

  const budgetCalculations = {
    recommendedTopUpAmount: computed(() => {
      const topUp = (Number(monthlyBudget.value) || 0) - stampStatistics.totalRemainingValue.value
      return Math.max(0, topUp)
    }),

    purchasableAmount: computed(
      () =>
        budgetCalculations.recommendedTopUpAmount.value -
        stampStatistics.totalPlannedPurchaseValue.value
    ),

    purchasableAmountLabel: computed(() =>
      budgetCalculations.purchasableAmount.value >= 0 ? '尚可採購金額' : '超出採購預算'
    ),
  }

  const proportionCalculations = {
    totalProportionSum: computed(() =>
      idealProportions.value.reduce((sum, p) => sum + (Number(p.proportion) || 0), 0)
    ),

    normalizedIdealProportions: computed(() => {
      const sum = proportionCalculations.totalProportionSum.value
      return normalizeProportions(idealProportions.value, sum)
    }),
  }

  const systemState = {
    currentRuleModeDisplay: computed(() => {
      const modeMap = {
        dynamic: '歷史數據建議模式',
        custom: '自定義模式',
      }
      return modeMap[currentRuleMode.value] || '自定義模式'
    }),

    averageMonthlyPurchases: computed(() => calculateAverageMonthlyPurchases()),
  }

  // === 工具函數 ===

  /**
   * 計算指定屬性的總數
   */
  function calculateTotalByProperty(property) {
    return safeExecute(
      () => {
        return stamps.value.reduce((sum, stamp) => {
          const value = Number(stamp[property]) || 0
          return sum + value
        }, 0)
      },
      0,
      `計算 ${property} 總數`
    )
  }

  /**
   * 計算指定屬性的總價值（數量 × 面額）
   */
  function calculateTotalValue(property) {
    return safeExecute(
      () => {
        return stamps.value.reduce((sum, stamp) => {
          const count = Number(stamp[property]) || 0
          const value = stamp.denomination * count
          return sum + value
        }, 0)
      },
      0,
      `計算 ${property} 總價值`
    )
  }

  /**
   * 正規化比例數據
   */
  function normalizeProportions(proportions, sum) {
    return safeExecute(
      () => {
        const normalized = {}

        if (sum === 0) {
          proportions.forEach(p => {
            normalized[p.denomination] = 0
          })
        } else {
          proportions.forEach(p => {
            normalized[p.denomination] = (Number(p.proportion) || 0) / sum
          })
        }

        return normalized
      },
      {},
      '正規化比例'
    )
  }

  /**
   * 計算月平均採購數量
   */
  function calculateAverageMonthlyPurchases() {
    return safeExecute(
      () => {
        const avgPurchases = {}
        const denominations = stamps.value.map(s => s.denomination)
        const numberOfMonths = monthlyPostageRecords.value.length

        if (numberOfMonths === 0) return avgPurchases

        denominations.forEach(denom => {
          const totalForDenom = monthlyPostageRecords.value.reduce((total, record) => {
            return total + (Number(record.purchases[denom]) || 0)
          }, 0)

          avgPurchases[denom] = totalForDenom / numberOfMonths
        })

        return avgPurchases
      },
      {},
      '計算月平均採購數量'
    )
  }

  /**
   * 獲取今日日期 (YYYY-MM-DD 格式)
   */
  function getTodayDate() {
    try {
      const today = new Date()

      // 確保日期物件有效
      if (isNaN(today.getTime())) {
        console.error('無效的日期物件')
        return ''
      }

      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const day = String(today.getDate()).padStart(2, '0')

      // 驗證年份合理性（應該在 2020 年之後）
      if (year < 2020) {
        console.error('日期年份異常:', year)
        return ''
      }

      return `${year}-${month}-${day}`
    } catch (error) {
      console.error('獲取今日日期時發生錯誤:', error)
      return ''
    }
  }

  /**
   * 檢查所有郵票是否滿足最低庫存
   */
  function allStampsMeetMinStock() {
    try {
      return stamps.value.every(stamp => {
        const currentTotal = (stamp.remainingCount || 0) + (stamp.purchaseCount || 0)
        const minRequired = stamp.minStock || 0
        return currentTotal >= minRequired
      })
    } catch (error) {
      console.error('檢查最低庫存時發生錯誤:', error)
      return false
    }
  }

  // === 動態預設值應用 ===

  /**
   * 應用動態預設值
   */
  async function applyDynamicDefaults(showSuccessAlert = false) {
    try {
      // 如果沒有歷史數據，提示用戶手動設定
      if (monthlyPostageRecords.value.length === 0) {
        if (showSuccessAlert) {
          await showAlert('沒有歷史採購數據，請手動設定採購規則。', '提示', 'info')
          showWarningToast('無歷史數據', '請在進階設定中手動設定採購規則')
        }
        return
      }

      const analysisResult = analyzeHistoricalData()
      applyCalculatedSettings(analysisResult)

      currentRuleMode.value = 'dynamic'

      if (showSuccessAlert) {
        await showAlert('採購規則已根據歷史數據重新計算並應用。', '成功', 'success')
        showSuccessToast('採購規則已更新', '已根據歷史數據重新計算')
      }
    } catch (error) {
      console.error('應用動態預設值時發生錯誤:', error)
      showErrorToast('設定失敗', '應用動態預設值時發生錯誤')
    }
  }

  /**
   * 分析歷史數據
   */
  function analyzeHistoricalData() {
    const denominations = stamps.value.map(s => s.denomination)
    const numberOfMonths = monthlyPostageRecords.value.length
    const totalPurchasedCounts = {}

    // 初始化計數器
    denominations.forEach(denom => {
      totalPurchasedCounts[denom] = 0
    })

    // 統計歷史採購數據
    monthlyPostageRecords.value.forEach(record => {
      Object.entries(record.purchases).forEach(([denom, count]) => {
        const parsedCount = Number(count) || 0
        totalPurchasedCounts[denom] = (totalPurchasedCounts[denom] || 0) + parsedCount
      })
    })

    const totalHistoricalPurchaseCount = Object.values(totalPurchasedCounts).reduce(
      (sum, count) => sum + count,
      0
    )

    return {
      totalPurchasedCounts,
      numberOfMonths,
      totalHistoricalPurchaseCount,
      denominations,
    }
  }

  /**
   * 應用基於分析結果的設定
   */
  function applyCalculatedSettings({
    totalPurchasedCounts,
    numberOfMonths,
    totalHistoricalPurchaseCount,
    denominations,
  }) {
    const dynamicMinStock = {}
    const dynamicIdealProportions = {}
    const priorityMapping = []

    // 計算各項動態設定
    denominations.forEach(denom => {
      const avgMonthlyCount = totalPurchasedCounts[denom] / numberOfMonths

      // 計算最低庫存（平均月使用量 × 緩衝係數）
      dynamicMinStock[denom] = Math.max(
        APP_DEFAULTS.minStock,
        Math.round(avgMonthlyCount * CONFIG.MIN_STOCK_BUFFER_FACTOR)
      )

      // 計算理想比例
      dynamicIdealProportions[denom] =
        totalHistoricalPurchaseCount > 0
          ? parseFloat(
              ((totalPurchasedCounts[denom] / totalHistoricalPurchaseCount) * 100).toFixed(2)
            )
          : 0

      priorityMapping.push({
        denomination: denom,
        avgMonthlyCount,
      })
    })

    // 計算優先級（基於使用頻率排序）
    const dynamicPriorities = calculatePriorities(priorityMapping)

    // 應用設定到郵票數據
    updateStampSettings(dynamicMinStock, dynamicPriorities)
    updateIdealProportions(dynamicIdealProportions)

    // 排序數據
    sortStampData()
  }

  /**
   * 計算優先級
   */
  function calculatePriorities(priorityMapping) {
    const priorities = {}

    priorityMapping
      .sort((a, b) => b.avgMonthlyCount - a.avgMonthlyCount)
      .forEach((item, index) => {
        priorities[item.denomination] =
          item.avgMonthlyCount > 0 ? index + 1 : APP_DEFAULTS.unusedPriority
      })

    return priorities
  }

  /**
   * 更新郵票設定
   */
  function updateStampSettings(dynamicMinStock, dynamicPriorities) {
    stamps.value.forEach(stamp => {
      stamp.minStock = dynamicMinStock[stamp.denomination] || APP_DEFAULTS.minStock
      stamp.priority = dynamicPriorities[stamp.denomination] || APP_DEFAULTS.unusedPriority
    })
  }

  /**
   * 更新理想比例
   */
  function updateIdealProportions(dynamicIdealProportions) {
    idealProportions.value.forEach(prop => {
      prop.proportion = dynamicIdealProportions[prop.denomination] || 0
    })
  }

  /**
   * 排序郵票數據
   */
  function sortStampData() {
    stamps.value.sort((a, b) => a.denomination - b.denomination)
    idealProportions.value.sort((a, b) => a.denomination - b.denomination)
  }

  /**
   * 儲存當前狀態
   */
  function saveCurrentState() {
    saveDataToLocalStorage({
      // 不儲存 statisticsDate，因為我們希望始終使用今日日期
      monthlyBudget: monthlyBudget.value,
      stamps: stamps.value,
      idealProportions: idealProportions.value,
      monthlyPostageRecords: monthlyPostageRecords.value,
      currentRuleMode: currentRuleMode.value,
      reportData: reportData.value,
      mailRecords: mailRecordState.mailRecords.value,
      stampInventoryTransactions: mailRecordState.stampInventoryTransactions.value,
    })
  }

  // === 重設功能 ===

  /**
   * 重設採購規則
   */
  async function resetAdvancedSettings(mode) {
    try {
      if (mode === 'basic') {
        resetToBasicSettings()
        await showAlert('採購規則已重設為基本預設值。', '重設完成', 'success')
        showSuccessToast('採購規則已重設', '已套用基本預設值')
      } else if (mode === 'dynamic') {
        await applyDynamicDefaults(true)
      }
    } catch (error) {
      console.error('重設採購規則時發生錯誤:', error)
    }
  }

  /**
   * 重設為基本設定
   */
  function resetToBasicSettings() {
    // 重設郵票設定
    stamps.value.forEach(currentStamp => {
      const defaultStamp = defaultStamps.find(s => s.denomination === currentStamp.denomination)
      if (defaultStamp) {
        currentStamp.minStock = defaultStamp.minStock
        currentStamp.priority = defaultStamp.priority
      }
    })

    // 重設理想比例
    idealProportions.value = JSON.parse(JSON.stringify(defaultIdealProportions)).map(p => ({
      ...p,
      proportion: parseFloat(p.proportion.toFixed(2)),
    }))

    currentRuleMode.value = 'custom'
  }

  /**
   * 重設採購數量和報告數據
   */
  function resetPurchases() {
    try {
      // 清除未鎖定的採購數量；使用者鎖定的數字必須保留
      stamps.value.forEach(stamp => {
        stamp.purchaseCount = getPreservedPurchaseCount(stamp)
      })

      // 清除報告數據
      reportData.value = null

      showSuccessToast('重設成功', '未鎖定的採購數量已清除，鎖定的數字已保留')
    } catch (error) {
      console.error('重設採購數量時發生錯誤:', error)
      showErrorToast('重設失敗', '重設採購數量時發生錯誤，請重試')
    }
  }

  // === 初始化 ===

  /**
   * 初始化應用程式數據
   */
  function initializeData() {
    try {
      // 設定預設值
      setDefaultValues()

      // 載入儲存的數據
      loadStoredData()

      // 應用規則模式
      applyRuleMode()

      // 設定預設日期
      setDefaultDate()

      // 排序數據
      sortStampData()
    } catch (error) {
      console.error('初始化數據時發生錯誤:', error)
      // 發生錯誤時使用預設值
      setDefaultValues()
    }
  }

  /**
   * 設定預設值
   */
  function setDefaultValues() {
    stamps.value = JSON.parse(JSON.stringify(defaultStamps))
    idealProportions.value = JSON.parse(JSON.stringify(defaultIdealProportions)).map(p => ({
      ...p,
      proportion: parseFloat(p.proportion.toFixed(2)),
    }))
  }

  /**
   * 載入儲存的數據
   */
  function loadStoredData() {
    const loadedData = loadDataFromLocalStorage()
    if (!loadedData) return

    // 載入基本設定（不包含 statisticsDate，因為我們希望始終使用今日日期）
    if (loadedData.monthlyBudget !== undefined) {
      monthlyBudget.value = loadedData.monthlyBudget
    }
    if (loadedData.monthlyPostageRecords) {
      monthlyPostageRecords.value = loadedData.monthlyPostageRecords
    }
    if (loadedData.currentRuleMode) {
      currentRuleMode.value = loadedData.currentRuleMode
    }
    if (loadedData.reportData) {
      reportData.value = loadedData.reportData
    }
    if (Array.isArray(loadedData.mailRecords))
      mailRecordState.mailRecords.value = loadedData.mailRecords
    if (Array.isArray(loadedData.stampInventoryTransactions)) {
      mailRecordState.stampInventoryTransactions.value = loadedData.stampInventoryTransactions
    }

    // 載入郵票設定
    loadStampSettings(loadedData)

    // 載入理想比例
    loadIdealProportionSettings(loadedData)
  }

  function restoreFromBackup(backupData) {
    setDefaultValues()
    monthlyBudget.value = backupData.monthlyBudget
    monthlyPostageRecords.value = backupData.monthlyPostageRecords
    currentRuleMode.value = backupData.currentRuleMode
    reportData.value = backupData.reportData
    mailRecordState.mailRecords.value = backupData.mailRecords || []
    mailRecordState.stampInventoryTransactions.value = backupData.stampInventoryTransactions || []
    loadStampSettings(backupData)
    loadIdealProportionSettings(backupData)
    sortStampData()
  }

  /**
   * 載入郵票設定
   */
  function loadStampSettings(loadedData) {
    if (!loadedData.stamps || !Array.isArray(loadedData.stamps)) return

    stamps.value.forEach(defaultStamp => {
      const storedStamp = loadedData.stamps.find(s => s.denomination === defaultStamp.denomination)

      if (storedStamp) {
        // 驗證並設定最低庫存
        const minStock = Number(storedStamp.minStock)
        if (!isNaN(minStock)) {
          defaultStamp.minStock = Math.max(APP_DEFAULTS.minStock, minStock)
        }

        const remainingCount = Number(storedStamp.remainingCount)
        if (!isNaN(remainingCount)) {
          defaultStamp.remainingCount = Math.max(0, Math.floor(remainingCount))
        }
        defaultStamp.remainingLocked = Boolean(storedStamp.remainingLocked)

        const purchaseCount = Number(storedStamp.purchaseCount)
        if (!isNaN(purchaseCount)) {
          defaultStamp.purchaseCount = Math.max(0, Math.floor(purchaseCount))
        }

        defaultStamp.purchaseMode = normalizePurchaseMode(storedStamp.purchaseMode)
        defaultStamp.fixedPurchaseCount = getPreservedPurchaseCount({
          ...storedStamp,
          purchaseMode: defaultStamp.purchaseMode,
        })
        if (defaultStamp.purchaseMode === 'fixed') {
          defaultStamp.purchaseCount = defaultStamp.fixedPurchaseCount
        }

        // 驗證並設定優先級
        const priority = Number(storedStamp.priority)
        if (!isNaN(priority)) {
          defaultStamp.priority = priority
        }
      }
    })
  }

  /**
   * 載入理想比例設定
   */
  function loadIdealProportionSettings(loadedData) {
    if (!loadedData.idealProportions || !Array.isArray(loadedData.idealProportions)) return

    idealProportions.value.forEach(defaultProp => {
      const storedProp = loadedData.idealProportions.find(
        p => p.denomination === defaultProp.denomination
      )

      if (storedProp) {
        const proportion = Number(storedProp.proportion)
        if (!isNaN(proportion)) {
          defaultProp.proportion = parseFloat(proportion.toFixed(2))
        }
      }
    })
  }

  /**
   * 應用規則模式
   */
  function applyRuleMode() {
    if (currentRuleMode.value !== 'custom') {
      applyDynamicDefaults()
    }
  }

  /**
   * 設定預設日期
   */
  function setDefaultDate() {
    // 始終設定為今日日期，確保日期的準確性
    const todayDate = getTodayDate()
    if (todayDate) {
      statisticsDate.value = todayDate
    } else {
      // 如果獲取今日日期失敗，使用備用方案
      console.warn('無法獲取今日日期，使用備用日期')
      statisticsDate.value = '2020-01-01'
    }
  }

  // === 監聽器 ===

  // 將所有可持久化資料集中監看，避免新增、編輯與匯入走出不同的儲存路徑。
  watch(monthlyBudget, value => {
    const normalized = Math.max(0, Math.floor(Number(value) || 0))
    if (value !== normalized) monthlyBudget.value = normalized
  })

  watch(
    [
      monthlyBudget,
      stamps,
      idealProportions,
      monthlyPostageRecords,
      currentRuleMode,
      reportData,
      mailRecordState.mailRecords,
      mailRecordState.stampInventoryTransactions,
    ],
    () => saveCurrentState(),
    { deep: true }
  )

  // 動態模式下，任何歷史紀錄變更都應重新計算規則，不只新增或刪除資料列。
  watch(
    monthlyPostageRecords,
    () => {
      if (currentRuleMode.value === 'dynamic') applyDynamicDefaults(false)
    },
    { deep: true }
  )

  // === 組件生命週期 ===
  onMounted(() => {
    initializeData()
  })

  // === 最佳採購建議整合 ===
  const { suggestOptimalPurchases } = useOptimalPurchases({
    stamps,
    idealProportions,
    purchasableAmount: budgetCalculations.purchasableAmount,
    allStampsMeetMinStock,
    totalStampCount: stampStatistics.totalStampCount,
    normalizedIdealProportions: proportionCalculations.normalizedIdealProportions,
    totalProportionSum: proportionCalculations.totalProportionSum,
    reportData,
    showReportModal: modalStates.showReportModal,
  })

  // === 返回值 ===
  return {
    // 基本設定
    statisticsDate,
    monthlyBudget,

    // 郵票與設定數據
    stamps,
    idealProportions,

    // UI 狀態
    showAdvancedSettingsModal: modalStates.showAdvancedSettingsModal,
    showReportModal: modalStates.showReportModal,
    showHistoryModal: modalStates.showHistoryModal,
    showPostageCombinatorModal: modalStates.showPostageCombinatorModal,
    showExportOptionsModal: modalStates.showExportOptionsModal,

    // 報告與紀錄
    reportData,
    monthlyPostageRecords,
    currentRecord,
    editingRecord,
    currentRuleMode,
    ...mailRecordState,

    // 計算屬性 - 郵票統計
    totalRemainingCount: stampStatistics.totalRemainingCount,
    totalRemainingValue: stampStatistics.totalRemainingValue,
    totalPlannedPurchaseCount: stampStatistics.totalPlannedPurchaseCount,
    totalPlannedPurchaseValue: stampStatistics.totalPlannedPurchaseValue,
    totalStampCount: stampStatistics.totalStampCount,
    totalStampValue: stampStatistics.totalStampValue,

    // 計算屬性 - 預算計算
    recommendedTopUpAmount: budgetCalculations.recommendedTopUpAmount,
    purchasableAmount: budgetCalculations.purchasableAmount,
    purchasableAmountLabel: budgetCalculations.purchasableAmountLabel,

    // 計算屬性 - 比例計算
    totalProportionSum: proportionCalculations.totalProportionSum,
    normalizedIdealProportions: proportionCalculations.normalizedIdealProportions,

    // 計算屬性 - 系統狀態
    currentRuleModeDisplay: systemState.currentRuleModeDisplay,
    averageMonthlyPurchases: systemState.averageMonthlyPurchases,

    // 核心方法
    getTodayDate,
    allStampsMeetMinStock,
    resetAdvancedSettings,
    resetPurchases,
    applyDynamicDefaults,
    restoreFromBackup,
    suggestOptimalPurchases,

    // 工具方法
    saveCurrentState,
  }
}
