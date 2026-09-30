import { useUtils } from './useUtils'
import { useNotifications } from './useNotifications'
import { safeExecute } from './useErrorHandler'
import { APP_DEFAULTS } from '../config/stampCatalog'
import { getPreservedPurchaseCount, PURCHASE_MODE } from './purchasePlanning'

// === 常數定義 ===
const CONFIG = {
  MAX_ITERATIONS: 1000,
  PERFORMANCE_WARNING_THRESHOLD: 2000,
  MEMORY_CLEANUP_INTERVAL: 100,
}

/**
 * 最佳採購建議系統
 *
 * 採用三階段策略：
 * 1. 階段一：滿足各面額最低庫存需求
 * 2. 階段二：按理想比例進行數量分配
 * 3. 階段三：貪婪算法填補剩餘零頭
 */
export function useOptimalPurchases(dependencies) {
  const {
    stamps,
    idealProportions,
    purchasableAmount,
    allStampsMeetMinStock,
    totalStampCount,
    normalizedIdealProportions,
    totalProportionSum,
    reportData,
    showReportModal,
  } = dependencies

  const { formatNumber } = useUtils()
  const { showErrorToast } = useNotifications()

  // === 階段一：滿足各面額最低庫存 ===

  /**
   * 階段一：優先滿足各面額的最低庫存需求
   * 按優先級排序，優先購買高優先級的郵票
   */
  function stage1MeetMinStock(stampsToProcess, budgetHolder) {
    return safeExecute(
      () => {
        let purchasesMade = 0
        let amountSpent = 0

        const sortedStamps = getSortedStampsByPriority(stampsToProcess)

        for (const stamp of sortedStamps) {
          if (budgetHolder.value <= 0) break

          const purchaseResult = tryPurchaseForMinStock(stamp, budgetHolder)
          purchasesMade += purchaseResult.purchases
          amountSpent += purchaseResult.spent
        }

        return { purchases: purchasesMade, spent: amountSpent }
      },
      { purchases: 0, spent: 0 },
      '階段一採購處理'
    )
  }

  /**
   * 按優先級排序郵票（優先級數字越小越優先）
   */
  function getSortedStampsByPriority(stamps) {
    return [...stamps].sort(
      (a, b) =>
        (a.priority || APP_DEFAULTS.unusedPriority) - (b.priority || APP_DEFAULTS.unusedPriority)
    )
  }

  /**
   * 嘗試購買郵票以滿足最低庫存
   */
  function tryPurchaseForMinStock(stamp, budgetHolder) {
    const currentTotalStock = (stamp.remainingCount || 0) + (stamp.purchaseCount || 0)
    const neededForMinStock = Math.max(0, (stamp.minStock || 0) - currentTotalStock)

    if (neededForMinStock <= 0) {
      return { purchases: 0, spent: 0 }
    }

    const costToBuyNeeded = neededForMinStock * stamp.denomination
    let purchaseCount = 0
    let actualCost = 0

    if (budgetHolder.value >= costToBuyNeeded) {
      // 預算足夠，購買所需數量
      purchaseCount = neededForMinStock
      actualCost = costToBuyNeeded
    } else {
      // 預算不足，購買能負擔的最大數量
      purchaseCount = Math.floor(budgetHolder.value / stamp.denomination)
      actualCost = purchaseCount * stamp.denomination
    }

    if (purchaseCount > 0) {
      stamp.purchaseCount += purchaseCount
      budgetHolder.value -= actualCost
    }

    return { purchases: purchaseCount, spent: actualCost }
  }

  // === 階段二：按理想比例進行數量分配 ===

  /**
   * 階段二：根據理想比例分配剩餘預算
   * 使用迭代算法確保比例平衡
   */
  function stage2ApplyIdealProportions(
    stampsToProcess,
    budgetHolder,
    normalizedProportions,
    activeDenominations
  ) {
    return safeExecute(
      () => {
        let purchasesMade = 0
        let amountSpent = 0

        if (!isValidForStage2(budgetHolder, activeDenominations, totalProportionSum)) {
          return { purchases: 0, spent: 0 }
        }

        const iterationResult = performProportionIterations(
          stampsToProcess,
          budgetHolder,
          normalizedProportions,
          activeDenominations
        )

        purchasesMade = iterationResult.purchases
        amountSpent = iterationResult.spent

        return { purchases: purchasesMade, spent: amountSpent }
      },
      { purchases: 0, spent: 0 },
      '階段二比例分配'
    )
  }

  /**
   * 驗證階段二的前提條件
   */
  function isValidForStage2(budgetHolder, activeDenominations, totalProportionSum) {
    return budgetHolder.value > 0 && activeDenominations.length > 0 && totalProportionSum.value > 0
  }

  /**
   * 執行比例平衡迭代
   */
  function performProportionIterations(
    stampsToProcess,
    budgetHolder,
    normalizedProportions,
    activeDenominations
  ) {
    let purchasesMade = 0
    let amountSpent = 0
    let iterationCount = 0
    let purchasesMadeInThisRound
    const startTime = Date.now()

    do {
      purchasesMadeInThisRound = false

      const leastFulfilledStamp = findLeastFulfilledStamp(
        stampsToProcess,
        normalizedProportions,
        activeDenominations,
        budgetHolder
      )

      if (leastFulfilledStamp) {
        const purchaseResult = calculateOptimalPurchaseAmount(
          leastFulfilledStamp.stamp,
          leastFulfilledStamp.currentRatio,
          stampsToProcess,
          normalizedProportions,
          activeDenominations,
          budgetHolder
        )

        if (purchaseResult.count > 0) {
          purchasesMade += purchaseResult.count
          amountSpent += purchaseResult.cost
          purchasesMadeInThisRound = true
        }
      }

      const canAffordAnyStamp = activeDenominations.some(denom => {
        const stamp = stampsToProcess.find(s => s.denomination === denom)
        return stamp && budgetHolder.value >= stamp.denomination
      })

      // 效能監控
      const elapsedTime = Date.now() - startTime
      if (elapsedTime > CONFIG.PERFORMANCE_WARNING_THRESHOLD) {
        console.warn(`比例分配迭代時間過長: ${elapsedTime}ms，已執行 ${iterationCount} 次迭代`)
        break
      }

      // 記憶體清理
      if (iterationCount % CONFIG.MEMORY_CLEANUP_INTERVAL === 0 && iterationCount > 0) {
        // 強制垃圾回收提示（在支援的環境中）
        if (typeof window !== 'undefined' && window.gc) {
          window.gc()
        }
      }

      if (
        !purchasesMadeInThisRound ||
        !canAffordAnyStamp ||
        iterationCount >= CONFIG.MAX_ITERATIONS
      ) {
        break
      }

      iterationCount++
    } while (purchasesMadeInThisRound && budgetHolder.value > 0)

    // 效能報告
    const totalTime = Date.now() - startTime
    if (totalTime > CONFIG.PERFORMANCE_WARNING_THRESHOLD) {
      console.warn(`比例分配完成，總耗時: ${totalTime}ms，迭代次數: ${iterationCount}`)
    }

    return { purchases: purchasesMade, spent: amountSpent }
  }

  /**
   * 找出比例最不足的郵票
   */
  function findLeastFulfilledStamp(
    stampsToProcess,
    normalizedProportions,
    activeDenominations,
    budgetHolder
  ) {
    let leastFulfilledStamp = null
    let minProportionRatio = Infinity

    for (const stamp of stampsToProcess) {
      if (!activeDenominations.includes(stamp.denomination)) continue
      if (budgetHolder.value < stamp.denomination) continue

      const idealProp = normalizedProportions[stamp.denomination]
      const currentTotal = (stamp.remainingCount || 0) + (stamp.purchaseCount || 0)
      const currentRatio = idealProp > 0 ? currentTotal / idealProp : Infinity

      if (currentRatio < minProportionRatio) {
        leastFulfilledStamp = { stamp, currentRatio }
        minProportionRatio = currentRatio
      }
    }

    return leastFulfilledStamp
  }

  /**
   * 計算最佳購買數量
   */
  function calculateOptimalPurchaseAmount(
    stamp,
    currentRatio,
    stampsToProcess,
    normalizedProportions,
    activeDenominations,
    budgetHolder
  ) {
    let numToBuy = 1

    // 找出第二小的比例，作為購買目標
    const secondMinRatio = findSecondMinProportionRatio(
      stampsToProcess,
      normalizedProportions,
      activeDenominations,
      stamp,
      currentRatio
    )

    if (secondMinRatio !== Infinity && secondMinRatio > currentRatio) {
      const targetTotal = secondMinRatio * normalizedProportions[stamp.denomination]
      const currentTotal = (stamp.remainingCount || 0) + (stamp.purchaseCount || 0)
      numToBuy = Math.max(1, Math.ceil(targetTotal - currentTotal))
    }

    // 確保不超過預算
    const maxAffordable = Math.floor(budgetHolder.value / stamp.denomination)
    numToBuy = Math.min(numToBuy, maxAffordable)

    const cost = numToBuy * stamp.denomination

    if (numToBuy > 0) {
      stamp.purchaseCount += numToBuy
      budgetHolder.value -= cost
    }

    return { count: numToBuy, cost }
  }

  /**
   * 找出第二小的比例值
   */
  function findSecondMinProportionRatio(
    stampsToProcess,
    normalizedProportions,
    activeDenominations,
    excludeStamp,
    minRatio
  ) {
    let secondMinRatio = Infinity

    for (const stamp of stampsToProcess) {
      if (!activeDenominations.includes(stamp.denomination) || stamp === excludeStamp) continue

      const idealProp = normalizedProportions[stamp.denomination]
      const currentTotal = (stamp.remainingCount || 0) + (stamp.purchaseCount || 0)
      const currentRatio = idealProp > 0 ? currentTotal / idealProp : Infinity

      if (currentRatio > minRatio && currentRatio < secondMinRatio) {
        secondMinRatio = currentRatio
      }
    }

    return secondMinRatio
  }

  // === 階段三：貪婪算法填補剩餘零頭 ===

  /**
   * 階段三：使用貪婪算法購買面額最大的郵票
   * 目標是快速消耗剩餘預算
   */
  function stage3GreedyFill(stampsToProcess, budgetHolder) {
    return safeExecute(
      () => {
        let purchasesMade = 0
        let amountSpent = 0

        if (budgetHolder.value <= 0) return { purchases: 0, spent: 0 }

        const sortedDenominations = getSortedDenominationsDesc(stampsToProcess)

        for (const denomination of sortedDenominations) {
          if (budgetHolder.value <= 0) break

          const purchaseResult = purchaseMaxAffordable(stampsToProcess, denomination, budgetHolder)
          purchasesMade += purchaseResult.purchases
          amountSpent += purchaseResult.spent
        }

        return { purchases: purchasesMade, spent: amountSpent }
      },
      { purchases: 0, spent: 0 },
      '階段三貪婪填補'
    )
  }

  /**
   * 獲取按面額降序排列的郵票面額
   */
  function getSortedDenominationsDesc(stamps) {
    return stamps
      .map(s => s.denomination)
      .filter(d => d > 0)
      .sort((a, b) => b - a)
  }

  /**
   * 購買指定面額的最大可負擔數量
   */
  function purchaseMaxAffordable(stamps, denomination, budgetHolder) {
    const stamp = stamps.find(s => s.denomination === denomination)
    if (!stamp) return { purchases: 0, spent: 0 }

    const canBuyCount = Math.floor(budgetHolder.value / stamp.denomination)
    if (canBuyCount <= 0) return { purchases: 0, spent: 0 }

    const cost = canBuyCount * stamp.denomination

    stamp.purchaseCount += canBuyCount
    budgetHolder.value -= cost

    return { purchases: canBuyCount, spent: cost }
  }

  // === 報告生成 ===

  /**
   * 生成採購明細報告
   */
  function getPurchaseDetailsForReport(initialRemainingCounts) {
    return safeExecute(
      () => {
        const purchaseDetails = []
        const totalFinalCount = totalStampCount.value
        const normalizedProportions = normalizedIdealProportions.value

        stamps.value.forEach(stamp => {
          const detail = createStampPurchaseDetail(
            stamp,
            initialRemainingCounts,
            totalFinalCount,
            normalizedProportions
          )
          purchaseDetails.push(detail)
        })

        return purchaseDetails
      },
      [],
      '生成採購明細報告'
    )
  }

  /**
   * 創建單個郵票的採購明細
   */
  function createStampPurchaseDetail(
    stamp,
    initialRemainingCounts,
    totalFinalCount,
    normalizedProportions
  ) {
    const initialStock = initialRemainingCounts[stamp.denomination] || 0
    const purchaseCount = stamp.purchaseCount || 0
    const purchaseAmount = purchaseCount * stamp.denomination
    const finalStock = initialStock + purchaseCount
    const stockValue = finalStock * stamp.denomination
    const minStock = stamp.minStock || 0

    const idealProportion = normalizedProportions[stamp.denomination] || 0
    const actualProportion = totalFinalCount > 0 ? finalStock / totalFinalCount : 0
    const proportionDifference = (actualProportion - idealProportion) * 100

    // 計算採購效率
    const purchaseEfficiency = calculatePurchaseEfficiency(
      purchaseCount,
      finalStock,
      minStock,
      idealProportion,
      actualProportion
    )

    return {
      denomination: stamp.denomination,
      initialStock,
      purchaseCount,
      purchaseAmount,
      finalStock,
      stockValue,
      meetsMinStock: finalStock >= minStock,
      idealProportion: (idealProportion * 100).toFixed(2),
      actualProportion: (actualProportion * 100).toFixed(2),
      proportionDifference: proportionDifference.toFixed(2),
      purchaseEfficiency,
    }
  }

  /**
   * 計算採購效率評級
   */
  function calculatePurchaseEfficiency(
    purchaseCount,
    finalStock,
    minStock,
    idealProportion,
    actualProportion
  ) {
    if (purchaseCount === 0) return '無採購'

    // 基礎分數：滿足最低庫存
    let score = finalStock >= minStock ? 40 : 0

    // 比例匹配分數 (最高40分)
    const proportionDiff = Math.abs(actualProportion - idealProportion)
    if (proportionDiff <= 0.005)
      score += 40 // 差異 <= 0.5%
    else if (proportionDiff <= 0.01)
      score += 35 // 差異 <= 1%
    else if (proportionDiff <= 0.02)
      score += 25 // 差異 <= 2%
    else if (proportionDiff <= 0.05)
      score += 15 // 差異 <= 5%
    else score += 5 // 差異 > 5%

    // 採購合理性分數 (最高20分)
    const stockRatio = minStock > 0 ? finalStock / minStock : 1
    if (stockRatio >= 1 && stockRatio <= 2)
      score += 20 // 1-2倍最低庫存
    else if (stockRatio >= 0.8 && stockRatio < 1)
      score += 15 // 80%-100%最低庫存
    else if (stockRatio > 2 && stockRatio <= 3)
      score += 15 // 2-3倍最低庫存
    else if (stockRatio > 3)
      score += 5 // 超過3倍
    else score += 0 // 低於80%

    // 轉換為評級
    if (score >= 90) return '優秀'
    if (score >= 80) return '良好'
    if (score >= 70) return '普通'
    if (score >= 60) return '待改善'
    return '不佳'
  }

  // === 主要採購建議函數 ===

  /**
   * 主要的最佳採購建議函數
   * 統合三個階段的採購策略
   */
  function suggestOptimalPurchases() {
    return safeExecute(
      () => {
        // 尚可採購金額已扣除畫面上目前的規劃數量；重新規劃前先加回，
        // 再由初始化流程只扣除真正鎖定的固定張數，避免重複扣款。
        const currentPlannedCost = stamps.value.reduce(
          (total, stamp) => total + (stamp.purchaseCount || 0) * stamp.denomination,
          0
        )
        const targetPurchaseAmount = purchasableAmount.value + currentPlannedCost

        // 檢查是否需要建議
        if (shouldSkipPurchaseSuggestion(targetPurchaseAmount)) {
          showEmptyReport(targetPurchaseAmount)
          return
        }

        // 初始化採購流程
        const { initialRemainingCounts, budgetHolder } =
          initializePurchaseProcess(targetPurchaseAmount)

        // 執行三階段採購
        const reportStages = executeThreeStagesPurchase(budgetHolder)

        // 生成最終報告
        const finalReport = generateFinalReport(
          targetPurchaseAmount,
          budgetHolder,
          reportStages,
          initialRemainingCounts
        )

        // 顯示報告並儲存
        displayReport(finalReport)
      },
      null,
      '執行採購建議',
      error => {
        console.error('採購建議執行失敗:', error)
        showErrorToast('系統錯誤', '執行採購建議時發生錯誤，請重試')

        // 重設未鎖定的採購數量，避免資料不一致
        try {
          stamps.value.forEach(stamp => {
            stamp.purchaseCount = getPreservedPurchaseCount(stamp)
          })
        } catch (resetError) {
          console.error('重設採購數量失敗:', resetError)
        }
      }
    )
  }

  /**
   * 檢查是否應該跳過採購建議
   */
  function shouldSkipPurchaseSuggestion(targetPurchaseAmount) {
    return targetPurchaseAmount <= 0 && allStampsMeetMinStock()
  }

  /**
   * 顯示空報告（無需採購）
   */
  function showEmptyReport(targetPurchaseAmount) {
    reportData.value = {
      initialPurchasableAmount: targetPurchaseAmount,
      stages: [],
      finalRemainingBudget: targetPurchaseAmount,
      finalMessage: '尚可採購金額為零或負數，且所有郵票已滿足最低庫存，無需建議。',
      purchaseDetails: getPurchaseDetailsForReport({}),
    }
    showReportModal.value = true
  }

  /**
   * 初始化採購流程
   */
  function initializePurchaseProcess(targetPurchaseAmount) {
    // 記錄初始庫存
    const initialRemainingCounts = {}
    let fixedPurchaseCost = 0
    stamps.value.forEach(stamp => {
      initialRemainingCounts[stamp.denomination] = stamp.remainingCount || 0
      stamp.purchaseCount = getPreservedPurchaseCount(stamp)
      fixedPurchaseCost += stamp.purchaseCount * stamp.denomination
    })

    // 創建預算持有者
    const budgetHolder = { value: Math.max(0, targetPurchaseAmount - fixedPurchaseCost) }

    return { initialRemainingCounts, budgetHolder }
  }

  /**
   * 執行三階段採購流程
   */
  function executeThreeStagesPurchase(budgetHolder) {
    const reportStages = []

    // 記錄每個階段前的採購狀態
    const stage1StartState = recordPurchaseState()

    // 階段一：滿足最低庫存
    const autoStamps = stamps.value.filter(stamp => stamp.purchaseMode === PURCHASE_MODE.AUTO)
    const stage1Result = stage1MeetMinStock(autoStamps, budgetHolder)
    const stage1Details = calculateStageDetails(stage1StartState)
    reportStages.push(
      createStageReport(
        '階段一：滿足各面額最低庫存',
        stage1Result,
        budgetHolder.value,
        stage1Details
      )
    )

    // 記錄階段二前的狀態
    const stage2StartState = recordPurchaseState()

    // 階段二：按理想比例分配
    const activeDenominations = getActiveDenominations().filter(denomination =>
      autoStamps.some(stamp => stamp.denomination === denomination)
    )
    const stage2Result = stage2ApplyIdealProportions(
      autoStamps,
      budgetHolder,
      normalizedIdealProportions.value,
      activeDenominations
    )
    const stage2Details = calculateStageDetails(stage2StartState)
    reportStages.push(
      createStageReport(
        '階段二：按理想比例進行數量分配',
        stage2Result,
        budgetHolder.value,
        stage2Details
      )
    )

    // 記錄階段三前的狀態
    const stage3StartState = recordPurchaseState()

    // 階段三：貪婪填補
    const stage3Result = stage3GreedyFill(autoStamps, budgetHolder)
    const stage3Details = calculateStageDetails(stage3StartState)
    reportStages.push(
      createStageReport(
        '階段三：貪婪算法填補剩餘零頭',
        stage3Result,
        budgetHolder.value,
        stage3Details
      )
    )

    return reportStages
  }

  /**
   * 獲取有效的面額列表（理想比例 > 0）
   */
  function getActiveDenominations() {
    return idealProportions.value
      .filter(p => (Number(p.proportion) || 0) > 0)
      .map(p => p.denomination)
  }

  /**
   * 記錄當前採購狀態
   */
  function recordPurchaseState() {
    const state = {}
    stamps.value.forEach(stamp => {
      state[stamp.denomination] = stamp.purchaseCount || 0
    })
    return state
  }

  /**
   * 計算階段採購詳情
   */
  function calculateStageDetails(startState) {
    const details = []
    stamps.value.forEach(stamp => {
      const startCount = startState[stamp.denomination] || 0
      const currentCount = stamp.purchaseCount || 0
      const stageCount = currentCount - startCount

      if (stageCount > 0) {
        details.push({
          denomination: stamp.denomination,
          count: stageCount,
          amount: stageCount * stamp.denomination,
        })
      }
    })

    // 按面額排序
    return details.sort((a, b) => b.denomination - a.denomination)
  }

  /**
   * 創建階段報告
   */
  function createStageReport(stageName, stageResult, remainingBudget, stageDetails = []) {
    return {
      name: stageName,
      totalPurchases: stageResult.purchases,
      totalSpent: stageResult.spent,
      remainingBudget,
      details: stageDetails,
    }
  }

  /**
   * 生成最終報告
   */
  function generateFinalReport(
    targetPurchaseAmount,
    budgetHolder,
    reportStages,
    initialRemainingCounts
  ) {
    const finalMessage = generateFinalMessage(budgetHolder.value)

    return {
      initialPurchasableAmount: targetPurchaseAmount,
      stages: reportStages,
      finalRemainingBudget: budgetHolder.value,
      finalMessage,
      purchaseDetails: getPurchaseDetailsForReport(initialRemainingCounts),
    }
  }

  /**
   * 生成最終訊息
   */
  function generateFinalMessage(remainingBudget) {
    if (remainingBudget <= 0) {
      return '預算已全部規劃。'
    }

    const minDenomValue = getMinDenominationValue()

    if (minDenomValue > 0 && remainingBudget < minDenomValue) {
      return `尚有 ${formatNumber(remainingBudget)} 元差額，因金額過小無法分配。\n您可手動調整採購數量。`
    }

    return `尚有 ${formatNumber(remainingBudget)} 元差額。\n您可手動調整採購數量或增加預算。`
  }

  /**
   * 獲取最小面額值
   */
  function getMinDenominationValue() {
    const validDenominations = stamps.value.map(s => s.denomination).filter(d => d > 0)

    return validDenominations.length > 0 ? Math.min(...validDenominations) : 0
  }

  /**
   * 顯示報告並儲存數據
   */
  function displayReport(finalReport) {
    reportData.value = finalReport
    showReportModal.value = true
  }

  // === 返回值 ===
  return {
    suggestOptimalPurchases,
  }
}
