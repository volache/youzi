import { useUtils } from './useUtils'
import { APP_VERSION } from '../config/appInfo'
import { useNotifications } from './useNotifications'
import { downloadTextFile } from '../utils/fileDownload'

// === 常數定義 ===
const CONFIG = {
  CSV_BOM: '\uFEFF', // UTF-8 BOM
  CSV_MIME_TYPE: 'text/csv;charset=utf-8',
  DECIMAL_PLACES: {
    PROPORTION: 2,
    NORMALIZED_RATIO: 4,
  },
}

/**
 * 數據匯出功能模組
 * 提供 CSV 匯出和報告複製功能
 */
export function useExport(dependencies) {
  const {
    statisticsDate,
    monthlyBudget,
    stamps,
    idealProportions,
    totalProportionSum,
    monthlyPostageRecords,
    totalRemainingCount,
    totalRemainingValue,
    totalPlannedPurchaseCount,
    totalPlannedPurchaseValue,
    totalStampCount,
    totalStampValue,
    reportData,
    currentRuleMode,
    currentRuleModeDisplay,
    allStampsMeetMinStock,
  } = dependencies

  const { formatNumber, formatMonthDisplay } = useUtils()
  const { alert: showAlert, showErrorToast, showSuccessToast } = useNotifications()

  // === CSV 匯出功能 ===

  /**
   * 匯出完整數據為 CSV 格式
   */
  function exportCSV() {
    try {
      const csvSections = [
        generateReportHeaderSection(),
        generateSystemConfigSection(),
        generateBasicSettingsSection(),
        generatePurchaseRulesSection(),
        generateInventorySection(),
        generateHistorySection(),
        generateMonthlyAnalysisSection(),
        generateStatisticsSection(),
        generatePerformanceSection(),
      ]

      downloadCSVFile(csvSections.join(''), `完整系統報告_${statisticsDate.value || 'report'}.csv`)
      showSuccessToast('匯出成功', '完整系統報告 CSV 已下載')
    } catch (error) {
      console.error('匯出 CSV 時發生錯誤:', error)
      showErrorToast('匯出失敗', '請重試')
    }
  }

  /**
   * 匯出歷史採購紀錄為 CSV 格式（專用於匯入）
   */
  function exportHistoryCSV() {
    try {
      if (monthlyPostageRecords.value.length === 0) {
        showAlert('沒有歷史紀錄可以匯出', '匯出提示', 'warning')
        return
      }

      const csvContent = generateHistoryCSVContent()
      downloadCSVFile(csvContent, `歷史採購紀錄_${statisticsDate.value || 'history'}.csv`)

      showSuccessToast('匯出成功', '歷史採購紀錄 CSV 已下載')
    } catch (error) {
      console.error('匯出歷史紀錄 CSV 時發生錯誤:', error)
      showErrorToast('匯出失敗', '請重試')
    }
  }

  /**
   * 匯出當前庫存明細為 CSV 格式
   */
  function exportInventoryCSV() {
    try {
      const csvContent = generateInventoryCSVContent()
      downloadCSVFile(csvContent, `當前庫存明細_${statisticsDate.value || 'inventory'}.csv`)

      showSuccessToast('匯出成功', '庫存明細 CSV 已下載')
    } catch (error) {
      console.error('匯出庫存明細 CSV 時發生錯誤:', error)
      showErrorToast('匯出失敗', '請重試')
    }
  }

  /**
   * 匯出採購建議報告為 CSV 格式
   */
  function exportPurchaseReportCSV() {
    try {
      if (!reportData.value) {
        showAlert('請先執行採購建議後再匯出報告', '無報告數據', 'warning')
        return
      }

      const csvContent = generatePurchaseReportCSVContent()
      downloadCSVFile(csvContent, `採購建議報告_${statisticsDate.value || 'purchase-report'}.csv`)

      showSuccessToast('匯出成功', '採購建議報告 CSV 已下載')
    } catch (error) {
      console.error('匯出採購建議報告 CSV 時發生錯誤:', error)
      showErrorToast('匯出失敗', '請重試')
    }
  }

  /**
   * 匯出月度統計分析為 CSV 格式
   */
  function exportMonthlyAnalysisCSV() {
    try {
      if (monthlyPostageRecords.value.length === 0) {
        showAlert('沒有歷史數據可以分析', '無歷史數據', 'warning')
        return
      }

      const csvContent = generateMonthlyAnalysisCSVContent()
      downloadCSVFile(csvContent, `月度統計分析_${statisticsDate.value || 'monthly-analysis'}.csv`)

      showSuccessToast('匯出成功', '月度統計分析 CSV 已下載')
    } catch (error) {
      console.error('匯出月度統計分析 CSV 時發生錯誤:', error)
      showErrorToast('匯出失敗', '請重試')
    }
  }

  /**
   * 生成歷史採購紀錄的純 CSV 內容
   */
  function generateHistoryCSVContent() {
    try {
      const historicalDenominations = getSortedDenominations()
      const columnHeaders = `月份,${historicalDenominations.map(d => `${d}元`).join(',')}\r\n`

      const dataRows = monthlyPostageRecords.value
        .map(record => {
          const monthCol = record.month // 使用原始格式 YYYY-MM
          const purchaseCols = historicalDenominations
            .map(denom => record.purchases[denom] || 0)
            .join(',')

          return `${monthCol},${purchaseCols}\r\n`
        })
        .join('')

      return columnHeaders + dataRows
    } catch (error) {
      console.error('生成歷史紀錄 CSV 內容時發生錯誤:', error)
      throw error
    }
  }

  /**
   * 生成庫存明細的純 CSV 內容
   */
  function generateInventoryCSVContent() {
    try {
      const header = `郵票庫存與採購明細 (${statisticsDate.value || '最新'})\r\n\r\n`
      const columnHeaders =
        '面額(NT$),剩餘張數,剩餘金額(NT$),計劃採購張數,計劃採購金額(NT$),合計張數,合計金額(NT$)\r\n'

      const dataRows = stamps.value
        .map(stamp => {
          return (
            [
              stamp.denomination,
              stamp.remainingCount || 0,
              stamp.denomination * (stamp.remainingCount || 0),
              stamp.purchaseCount || 0,
              stamp.denomination * (stamp.purchaseCount || 0),
              (stamp.remainingCount || 0) + (stamp.purchaseCount || 0),
              stamp.denomination * ((stamp.remainingCount || 0) + (stamp.purchaseCount || 0)),
            ].join(',') + '\r\n'
          )
        })
        .join('')

      const summaryRow =
        [
          '總計',
          totalRemainingCount.value,
          totalRemainingValue.value,
          totalPlannedPurchaseCount.value,
          totalPlannedPurchaseValue.value,
          totalStampCount.value,
          totalStampValue.value,
        ].join(',') + '\r\n\r\n'

      const statisticsSection = [
        '統計資訊\r\n',
        `統計日期,"${statisticsDate.value || '未設定'}"\r\n`,
        `每月預算(NT$),${monthlyBudget.value || 0}\r\n`,
        `剩餘郵票總金額(NT$),${totalRemainingValue.value}\r\n`,
        `建議補足郵資(NT$),${Math.max(0, (monthlyBudget.value || 0) - totalRemainingValue.value)}\r\n`,
        `尚可採購金額(NT$),${Math.max(0, (monthlyBudget.value || 0) - totalRemainingValue.value) - totalPlannedPurchaseValue.value}\r\n`,
      ].join('')

      return header + columnHeaders + dataRows + summaryRow + statisticsSection
    } catch (error) {
      console.error('生成庫存明細 CSV 內容時發生錯誤:', error)
      throw error
    }
  }

  /**
   * 生成報告標題區段
   */
  function generateReportHeaderSection() {
    return [
      '郵資大師完整系統報告\r\n',
      `報告生成時間,"${new Date().toLocaleString('zh-TW')}"\r\n`,
      `系統版本,v${APP_VERSION}\r\n`,
      `報告類型,完整系統狀態報告\r\n\r\n`,
    ].join('')
  }

  /**
   * 生成系統配置區段
   */
  function generateSystemConfigSection() {
    try {
      return [
        '系統配置\r\n',
        `當前採購模式,"${currentRuleModeDisplay.value || '未設定'}"\r\n`,
        `採購模式代碼,"${currentRuleMode.value || 'unknown'}"\r\n`,
        `歷史數據記錄數,${monthlyPostageRecords.value.length}筆\r\n`,
        `郵票面額種類,${stamps.value.length}種\r\n`,
        `理想比例設定總和,${totalProportionSum.value.toFixed(2)}\r\n`,
        `所有郵票是否滿足最低庫存,${allStampsMeetMinStock() ? '是' : '否'}\r\n\r\n`,
      ].join('')
    } catch (error) {
      console.error('生成系統配置區段時發生錯誤:', error)
      return '系統配置\r\n錯誤：無法生成數據\r\n\r\n'
    }
  }

  /**
   * 生成基本設定區段
   */
  function generateBasicSettingsSection() {
    return [
      '基本設定\r\n',
      `統計日期,"${statisticsDate.value}"\r\n`,
      `每月預算(NT$),${monthlyBudget.value || 0}\r\n\r\n`,
    ].join('')
  }

  /**
   * 生成採購規則設定區段
   */
  function generatePurchaseRulesSection() {
    try {
      const header = '採購規則設定\r\n'
      const columnHeaders =
        '面額(NT$),最低庫存(張),優先級,理想比例(權重值),正規化後比例(%),當前庫存(張),庫存狀態,採購建議\r\n'

      const dataRows = stamps.value
        .map(stamp => {
          const proportionObj = findProportionForStamp(stamp.denomination)
          const normalizedRatio = calculateNormalizedRatio(proportionObj)
          const currentStock = stamp.remainingCount || 0
          const minStock = stamp.minStock || 0
          const stockStatus = currentStock >= minStock ? '充足' : '不足'
          const purchaseAdvice =
            currentStock < minStock ? `建議採購${minStock - currentStock}張` : '無需採購'

          return (
            [
              stamp.denomination,
              minStock,
              stamp.priority || 0,
              (proportionObj ? proportionObj.proportion : 0) || 0,
              (parseFloat(normalizedRatio) * 100).toFixed(2),
              currentStock,
              stockStatus,
              purchaseAdvice,
            ].join(',') + '\r\n'
          )
        })
        .join('')

      const summaryRows = [
        `理想比例權重總和, , ,${totalProportionSum.value.toFixed(CONFIG.DECIMAL_PLACES.PROPORTION)}, , , ,\r\n`,
        `採購規則模式, , , ,"${currentRuleModeDisplay.value || '未設定'}", , ,\r\n`,
        `規則最後更新, , , ,"${statisticsDate.value || '未設定'}", , ,\r\n\r\n`,
      ].join('')

      return header + columnHeaders + dataRows + summaryRows
    } catch (error) {
      console.error('生成採購規則區段時發生錯誤:', error)
      return '採購規則設定\r\n錯誤：無法生成數據\r\n\r\n'
    }
  }

  /**
   * 生成歷史採購紀錄區段
   */
  function generateHistorySection() {
    try {
      if (monthlyPostageRecords.value.length === 0) {
        return '歷史採購紀錄\r\n無歷史數據\r\n\r\n'
      }

      const header = '歷史採購紀錄 (張數)\r\n'
      const historicalDenominations = getSortedDenominations()
      const columnHeaders = `月份,${historicalDenominations.map(d => `${d}元`).join(',')}\r\n`

      const dataRows = monthlyPostageRecords.value
        .map(record => {
          const monthCol = formatMonthDisplay(record.month)
          const purchaseCols = historicalDenominations
            .map(denom => record.purchases[denom] || 0)
            .join(',')

          return `${monthCol},${purchaseCols}\r\n`
        })
        .join('')

      return header + columnHeaders + dataRows + '\r\n'
    } catch (error) {
      console.error('生成歷史紀錄區段時發生錯誤:', error)
      return '歷史採購紀錄\r\n錯誤：無法生成數據\r\n\r\n'
    }
  }

  /**
   * 生成郵票庫存與採購明細區段
   */
  function generateInventorySection() {
    try {
      const header = '郵票庫存與採購明細\r\n'
      const columnHeaders =
        '面額(NT$),剩餘張數,剩餘金額,計劃採購張數,計劃採購金額,合計張數,合計金額\r\n'

      const dataRows = stamps.value
        .map(stamp => {
          return (
            [
              stamp.denomination,
              stamp.remainingCount || 0,
              stamp.denomination * (stamp.remainingCount || 0),
              stamp.purchaseCount || 0,
              stamp.denomination * (stamp.purchaseCount || 0),
              (stamp.remainingCount || 0) + (stamp.purchaseCount || 0),
              stamp.denomination * ((stamp.remainingCount || 0) + (stamp.purchaseCount || 0)),
            ].join(',') + '\r\n'
          )
        })
        .join('')

      const summaryRow =
        [
          '總計',
          totalRemainingCount.value,
          totalRemainingValue.value,
          totalPlannedPurchaseCount.value,
          totalPlannedPurchaseValue.value,
          totalStampCount.value,
          totalStampValue.value,
        ].join(',') + '\r\n\r\n'

      return header + columnHeaders + dataRows + summaryRow
    } catch (error) {
      console.error('生成庫存明細區段時發生錯誤:', error)
      return '郵票庫存與採購明細\r\n錯誤：無法生成數據\r\n\r\n'
    }
  }

  /**
   * 生成統計資訊區段
   */
  function generateStatisticsSection() {
    try {
      const recommendedTopUp = Math.max(0, (monthlyBudget.value || 0) - totalRemainingValue.value)
      const purchasableAmount = recommendedTopUp - totalPlannedPurchaseValue.value

      return [
        '統計資訊\r\n',
        `郵票總張數,${totalStampCount.value} 張\r\n`,
        `剩餘郵票總金額,${totalRemainingValue.value} 元\r\n`,
        `建議補足郵資,${recommendedTopUp} 元\r\n`,
        `尚可採購金額,${purchasableAmount} 元\r\n`,
        `預算使用率,${totalRemainingValue.value > 0 && monthlyBudget.value > 0 ? ((totalRemainingValue.value / monthlyBudget.value) * 100).toFixed(2) : '0.00'}%\r\n\r\n`,
      ].join('')
    } catch (error) {
      console.error('生成統計資訊區段時發生錯誤:', error)
      return '統計資訊\r\n錯誤：無法生成數據\r\n\r\n'
    }
  }

  /**
   * 生成月度分析區段
   */
  function generateMonthlyAnalysisSection() {
    try {
      if (monthlyPostageRecords.value.length === 0) {
        return '月度分析\r\n無歷史數據可供分析\r\n\r\n'
      }

      const totalMonths = monthlyPostageRecords.value.length
      const denominations = getSortedDenominations()

      // 計算月平均使用量
      const monthlyAverages = denominations.map(denom => {
        const totalUsage = monthlyPostageRecords.value.reduce(
          (sum, record) => sum + (Number(record.purchases[denom]) || 0),
          0
        )
        const avgMonthly = totalUsage / totalMonths
        return {
          denomination: denom,
          totalUsage,
          avgMonthly: avgMonthly.toFixed(2),
          avgCost: (avgMonthly * denom).toFixed(2),
        }
      })

      const header = '月度分析\r\n'
      const columnHeaders = '面額(NT$),總使用量(張),月平均使用量(張),月平均成本(NT$)\r\n'

      const dataRows = monthlyAverages
        .map(avg => {
          return [avg.denomination, avg.totalUsage, avg.avgMonthly, avg.avgCost].join(',') + '\r\n'
        })
        .join('')

      const totalAvgCost = monthlyAverages.reduce((sum, avg) => sum + parseFloat(avg.avgCost), 0)
      const summaryRow = `總計, ,${monthlyAverages.reduce((sum, avg) => sum + parseFloat(avg.avgMonthly), 0).toFixed(2)},${totalAvgCost.toFixed(2)}\r\n`
      const analysisInfo = [
        `分析期間,${totalMonths}個月\r\n`,
        `數據範圍,"${monthlyPostageRecords.value[0]?.month || ''}" 至 "${monthlyPostageRecords.value[monthlyPostageRecords.value.length - 1]?.month || ''}"\r\n\r\n`,
      ].join('')

      return header + columnHeaders + dataRows + summaryRow + analysisInfo
    } catch (error) {
      console.error('生成月度分析區段時發生錯誤:', error)
      return '月度分析\r\n錯誤：無法生成數據\r\n\r\n'
    }
  }

  /**
   * 生成效能區段
   */
  function generatePerformanceSection() {
    try {
      const totalStamps = stamps.value.length
      const stockedStamps = stamps.value.filter(s => (s.remainingCount || 0) > 0).length
      const minStockMet = stamps.value.filter(
        s => (s.remainingCount || 0) >= (s.minStock || 0)
      ).length
      const hasIdealProportion = idealProportions.value.filter(p => (p.proportion || 0) > 0).length

      return [
        '系統效能指標\r\n',
        `郵票配置完整度,${((stockedStamps / totalStamps) * 100).toFixed(2)}% (${stockedStamps}/${totalStamps})\r\n`,
        `最低庫存達成率,${((minStockMet / totalStamps) * 100).toFixed(2)}% (${minStockMet}/${totalStamps})\r\n`,
        `理想比例設定率,${((hasIdealProportion / totalStamps) * 100).toFixed(2)}% (${hasIdealProportion}/${totalStamps})\r\n`,
        `歷史數據豐富度,${monthlyPostageRecords.value.length >= 12 ? '充足' : monthlyPostageRecords.value.length >= 6 ? '普通' : '不足'} (${monthlyPostageRecords.value.length}個月)\r\n`,
        `系統健康度,${calculateSystemHealth()}%\r\n`,
        `建議改善項目,"${getImprovementSuggestions()}"\r\n\r\n`,
      ].join('')
    } catch (error) {
      console.error('生成效能區段時發生錯誤:', error)
      return '系統效能指標\r\n錯誤：無法生成數據\r\n\r\n'
    }
  }

  /**
   * 計算系統健康度
   */
  function calculateSystemHealth() {
    try {
      let score = 0
      const totalStamps = stamps.value.length

      // 庫存配置 (30分)
      const stockedStamps = stamps.value.filter(s => (s.remainingCount || 0) > 0).length
      score += (stockedStamps / totalStamps) * 30

      // 最低庫存達成 (25分)
      const minStockMet = stamps.value.filter(
        s => (s.remainingCount || 0) >= (s.minStock || 0)
      ).length
      score += (minStockMet / totalStamps) * 25

      // 理想比例設定 (20分)
      const hasIdealProportion = idealProportions.value.filter(p => (p.proportion || 0) > 0).length
      score += (hasIdealProportion / totalStamps) * 20

      // 歷史數據 (15分)
      const historyScore = Math.min(monthlyPostageRecords.value.length / 12, 1) * 15
      score += historyScore

      // 預算設定 (10分)
      if (monthlyBudget.value > 0) score += 10

      return Math.round(score)
    } catch (error) {
      console.error('計算系統健康度時發生錯誤:', error)
      return 0
    }
  }

  /**
   * 獲取改善建議
   */
  function getImprovementSuggestions() {
    try {
      const suggestions = []

      const totalStamps = stamps.value.length
      const stockedStamps = stamps.value.filter(s => (s.remainingCount || 0) > 0).length
      const minStockMet = stamps.value.filter(
        s => (s.remainingCount || 0) >= (s.minStock || 0)
      ).length
      const hasIdealProportion = idealProportions.value.filter(p => (p.proportion || 0) > 0).length

      if (stockedStamps < totalStamps) {
        suggestions.push('補充缺少的郵票庫存')
      }

      if (minStockMet < totalStamps) {
        suggestions.push('提高郵票庫存至最低要求')
      }

      if (hasIdealProportion < totalStamps) {
        suggestions.push('設定完整的理想比例')
      }

      if (monthlyPostageRecords.value.length < 6) {
        suggestions.push('累積更多歷史使用數據')
      }

      if (!monthlyBudget.value || monthlyBudget.value <= 0) {
        suggestions.push('設定合理的每月預算')
      }

      return suggestions.length > 0 ? suggestions.join('；') : '系統運行良好'
    } catch (error) {
      console.error('獲取改善建議時發生錯誤:', error)
      return '無法生成建議'
    }
  }

  /**
   * 生成採購建議報告的 CSV 內容
   */
  function generatePurchaseReportCSVContent() {
    try {
      const header = `採購建議報告 (${statisticsDate.value || '最新'})\r\n\r\n`

      // 計算實際採購金額和剩餘預算
      const targetPurchaseAmount = reportData.value.initialPurchasableAmount || 0
      const remainingBudget = reportData.value.finalRemainingBudget || 0
      const actualPurchaseAmount = targetPurchaseAmount - remainingBudget

      // 基本資訊
      const basicInfo = [
        '基本資訊\r\n',
        `報告生成時間,"${new Date().toLocaleString('zh-TW')}"\r\n`,
        `統計日期,"${statisticsDate.value || '未設定'}"\r\n`,
        `每月預算(NT$),${monthlyBudget.value || 0}\r\n`,
        `目標採購金額(NT$),${targetPurchaseAmount}\r\n`,
        `實際採購金額(NT$),${actualPurchaseAmount}\r\n`,
        `剩餘預算(NT$),${remainingBudget}\r\n\r\n`,
      ].join('')

      // 採購明細
      const detailsHeader = '採購明細\r\n'
      const detailsColumns =
        '面額(NT$),初始庫存(張),建議採購(張),採購金額(NT$),最終庫存(張),庫存價值(NT$),滿足最低庫存,理想比例(%),實際比例(%),比例差異(%),採購效率\r\n'

      const detailsRows = reportData.value.purchaseDetails
        .map(detail => {
          return (
            [
              detail.denomination,
              detail.initialStock,
              detail.purchaseCount,
              detail.purchaseAmount,
              detail.finalStock,
              detail.stockValue,
              detail.meetsMinStock ? '是' : '否',
              detail.idealProportion,
              detail.actualProportion,
              detail.proportionDifference,
              detail.purchaseEfficiency,
            ].join(',') + '\r\n'
          )
        })
        .join('')

      // 三階段策略分析
      const stagesHeader = '\r\n三階段採購策略\r\n'
      let stagesData = ''

      if (reportData.value.stages && reportData.value.stages.length > 0) {
        stagesData = reportData.value.stages
          .map((stage, index) => {
            const stageName = stage.name || `階段${index + 1}`
            const purchases = stage.totalPurchases || 0
            const spent = stage.totalSpent || 0
            return `${stageName},${purchases}張,${spent}元\r\n`
          })
          .join('')
      } else {
        stagesData =
          '階段一：最低庫存補足,0張,0元\r\n階段二：比例平衡調整,0張,0元\r\n階段三：剩餘預算分配,0張,0元\r\n'
      }
      stagesData += '\r\n'

      // 效率分析
      const efficiencyHeader = '效率分析\r\n'
      const budgetUsageRate =
        targetPurchaseAmount > 0
          ? ((actualPurchaseAmount / targetPurchaseAmount) * 100).toFixed(2)
          : '0.00'

      // 將採購效率文字評級轉換為數字分數來計算平均值
      const convertEfficiencyToScore = efficiency => {
        switch (efficiency) {
          case '優秀':
            return 95
          case '良好':
            return 85
          case '普通':
            return 75
          case '待改善':
            return 65
          case '不佳':
            return 50
          case '無採購':
            return 0
          default:
            return 0
        }
      }

      const avgEfficiency =
        reportData.value.purchaseDetails.length > 0
          ? (
              reportData.value.purchaseDetails.reduce(
                (sum, d) => sum + convertEfficiencyToScore(d.purchaseEfficiency),
                0
              ) / reportData.value.purchaseDetails.length
            ).toFixed(2)
          : '0.00'

      const minStockMeetRate =
        reportData.value.purchaseDetails.length > 0
          ? (
              (reportData.value.purchaseDetails.filter(d => d.meetsMinStock).length /
                reportData.value.purchaseDetails.length) *
              100
            ).toFixed(2)
          : '0.00'

      const efficiencyData = [
        `預算使用率,${budgetUsageRate}%\r\n`,
        `平均採購效率,${avgEfficiency}分\r\n`,
        `滿足最低庫存比例,${minStockMeetRate}%\r\n`,
        `最終訊息,"${reportData.value.finalMessage || '無訊息'}"\r\n`,
      ].join('')

      return (
        header +
        basicInfo +
        detailsHeader +
        detailsColumns +
        detailsRows +
        stagesHeader +
        stagesData +
        efficiencyHeader +
        efficiencyData
      )
    } catch (error) {
      console.error('生成採購建議報告 CSV 內容時發生錯誤:', error)
      throw error
    }
  }

  /**
   * 生成月度統計分析的 CSV 內容
   */
  function generateMonthlyAnalysisCSVContent() {
    try {
      const header = `月度統計分析報告 (${statisticsDate.value || '最新'})\r\n\r\n`

      // 基本統計
      const basicStats = [
        '基本統計\r\n',
        `分析期間,${monthlyPostageRecords.value.length}個月\r\n`,
        `數據範圍,"${monthlyPostageRecords.value[0]?.month || ''}" 至 "${monthlyPostageRecords.value[monthlyPostageRecords.value.length - 1]?.month || ''}"\r\n`,
        `報告生成時間,"${new Date().toLocaleString('zh-TW')}"\r\n\r\n`,
      ].join('')

      // 月平均使用量分析
      const avgHeader = '月平均使用量分析\r\n'
      const avgColumns =
        '面額(NT$),總採購量(張),月平均採購量(張),月平均金額(NT$),使用頻率排名,成本占比(%)\r\n'

      const denominations = getSortedDenominations()
      const totalMonths = monthlyPostageRecords.value.length
      const analysisData = []
      let totalCost = 0

      // 計算各面額統計
      denominations.forEach(denom => {
        const totalPurchases = monthlyPostageRecords.value.reduce(
          (sum, record) => sum + (Number(record.purchases[denom]) || 0),
          0
        )
        const avgMonthly = totalPurchases / totalMonths
        const avgCost = avgMonthly * denom
        totalCost += avgCost

        analysisData.push({
          denomination: denom,
          totalPurchases,
          avgMonthly: avgMonthly.toFixed(2),
          avgCost: avgCost.toFixed(2),
          costRatio: 0, // 稍後計算
        })
      })

      // 計算成本占比和排名
      analysisData.forEach(data => {
        data.costRatio =
          totalCost > 0 ? ((parseFloat(data.avgCost) / totalCost) * 100).toFixed(2) : '0.00'
      })

      // 按平均使用量排序以獲得排名
      const sortedByUsage = [...analysisData].sort(
        (a, b) => parseFloat(b.avgMonthly) - parseFloat(a.avgMonthly)
      )

      const avgRows = analysisData
        .map(data => {
          const rank = sortedByUsage.findIndex(item => item.denomination === data.denomination) + 1
          return (
            [
              data.denomination,
              data.totalPurchases,
              data.avgMonthly,
              data.avgCost,
              rank,
              data.costRatio,
            ].join(',') + '\r\n'
          )
        })
        .join('')

      // 趨勢分析
      const trendHeader = '\r\n月度趨勢分析\r\n'
      const trendColumns = `月份,${denominations.map(d => `${d}元`).join(',')},月總採購量,月總金額\r\n`

      const trendRows = monthlyPostageRecords.value
        .map(record => {
          const monthlyTotal = denominations.reduce(
            (sum, denom) => sum + (Number(record.purchases[denom]) || 0),
            0
          )
          const monthlyValue = denominations.reduce(
            (sum, denom) => sum + (Number(record.purchases[denom]) || 0) * denom,
            0
          )

          const monthData =
            [
              formatMonthDisplay(record.month),
              ...denominations.map(denom => record.purchases[denom] || 0),
              monthlyTotal,
              monthlyValue,
            ].join(',') + '\r\n'

          return monthData
        })
        .join('')

      // 成本效益分析
      const costEfficiencyHeader = '\r\n成本效益分析\r\n'
      const costEfficiencyData = [
        `月平均總採購金額,${totalCost.toFixed(2)}元\r\n`,
        `最高使用面額,${sortedByUsage[0]?.denomination || 'N/A'}元\r\n`,
        `最低使用面額,${sortedByUsage[sortedByUsage.length - 1]?.denomination || 'N/A'}元\r\n`,
        `使用集中度(前3名占比),${sortedByUsage
          .slice(0, 3)
          .reduce((sum, item) => sum + parseFloat(item.costRatio), 0)
          .toFixed(2)}%\r\n`,
      ].join('')

      return (
        header +
        basicStats +
        avgHeader +
        avgColumns +
        avgRows +
        trendHeader +
        trendColumns +
        trendRows +
        costEfficiencyHeader +
        costEfficiencyData
      )
    } catch (error) {
      console.error('生成月度統計分析 CSV 內容時發生錯誤:', error)
      throw error
    }
  }

  /**
   * 下載 CSV 檔案
   */
  function downloadCSVFile(csvContent, filename) {
    try {
      downloadTextFile(CONFIG.CSV_BOM + csvContent, filename, CONFIG.CSV_MIME_TYPE)
    } catch (error) {
      console.error('下載 CSV 檔案時發生錯誤:', error)
      throw error
    }
  }

  // === 報告複製功能 ===

  /**
   * 複製報告到剪貼簿
   */
  async function copyReportToClipboard() {
    try {
      if (!reportData.value) {
        await showAlert('沒有可複製的報告數據。', '無數據', 'warning')
        return
      }

      const reportSections = [
        generateReportHeader(),
        generateStagesSection(),
        generateFinalSummary(),
        generateStampSummarySection(),
      ]

      const reportText = reportSections.join('')

      await copyTextToClipboard(reportText)
    } catch (error) {
      console.error('複製報告時發生錯誤:', error)
      await showAlert('複製失敗，請手動複製。', '複製錯誤', 'error')
      showErrorToast('複製失敗', '請手動複製')
    }
  }

  /**
   * 生成報告標題
   */
  function generateReportHeader() {
    return (
      `郵資計算報告 (${statisticsDate.value || '最新'})\n\n` +
      `初始尚可採購金額: ${formatNumber(reportData.value.initialPurchasableAmount)} 元\n\n`
    )
  }

  /**
   * 生成階段報告區段
   */
  function generateStagesSection() {
    try {
      return reportData.value.stages
        .map(stage => {
          return (
            `${stage.name}:\n` +
            `  採購 ${stage.totalPurchases} 張，花費 ${formatNumber(stage.totalSpent)} 元。\n` +
            `  (剩餘預算: ${formatNumber(stage.remainingBudget)} 元)\n\n`
          )
        })
        .join('')
    } catch (error) {
      console.error('生成階段報告時發生錯誤:', error)
      return '階段報告：生成錯誤\n\n'
    }
  }

  /**
   * 生成最終摘要
   */
  function generateFinalSummary() {
    return (
      `最終剩餘預算: ${formatNumber(reportData.value.finalRemainingBudget)} 元\n` +
      `${reportData.value.finalMessage}\n\n`
    )
  }

  /**
   * 生成郵票總結區段
   */
  function generateStampSummarySection() {
    try {
      const header =
        '郵票總結:\n' +
        '面額\t初始\t建議採購\t最終合計\t最低庫存\t滿足最低\t理想比例\t實際比例\t比例差異\n'

      const stampRows = reportData.value.purchaseDetails
        .map(stamp => {
          return (
            `${stamp.denomination}\t${stamp.initialStock}\t${stamp.purchaseCount}\t` +
            `${stamp.finalStock}\t${stamp.minStock || 0}\t${stamp.meetsMinStock ? '是' : '否'}\t` +
            `${stamp.idealProportion}%\t${stamp.actualProportion}%\t${stamp.proportionDifference}%\n`
          )
        })
        .join('')

      return header + stampRows
    } catch (error) {
      console.error('生成郵票總結時發生錯誤:', error)
      return '郵票總結：生成錯誤\n'
    }
  }

  /**
   * 執行剪貼簿複製操作
   */
  async function copyTextToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text)
      showSuccessToast('複製成功', '報告已複製到剪貼簿')
    } catch (err) {
      console.error('剪貼簿 API 失敗:', err)
      // 備用方案：使用傳統方法
      fallbackCopyToClipboard(text)
    }
  }

  /**
   * 備用複製方法
   */
  function fallbackCopyToClipboard(text) {
    try {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      showSuccessToast('複製成功', '報告已複製到剪貼簿')
    } catch (err) {
      console.error('備用複製方法失敗:', err)
      showErrorToast('複製失敗', '請手動複製')
    }
  }

  // === 輔助函數 ===

  /**
   * 尋找指定面額的比例設定
   */
  function findProportionForStamp(denomination) {
    return idealProportions.value.find(p => p.denomination === denomination)
  }

  /**
   * 計算正規化比例
   */
  function calculateNormalizedRatio(proportionObj) {
    if (!proportionObj || totalProportionSum.value === 0) {
      return '0.0000'
    }

    const ratio = proportionObj.proportion / totalProportionSum.value
    return ratio.toFixed(CONFIG.DECIMAL_PLACES.NORMALIZED_RATIO)
  }

  /**
   * 獲取排序後的面額列表
   */
  function getSortedDenominations() {
    return stamps.value.map(s => s.denomination).sort((a, b) => a - b)
  }

  // === 返回值 ===
  return {
    exportCSV,
    exportHistoryCSV,
    exportInventoryCSV,
    exportPurchaseReportCSV,
    exportMonthlyAnalysisCSV,
    copyReportToClipboard,
  }
}
