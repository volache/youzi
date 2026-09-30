import { ref, computed } from 'vue'
import {
  POSTAGE_CONFIG,
  POSTAGE_RATES,
  STAMP_DENOMINATIONS,
  HIGHLIGHT_COLORS,
  calculatePostageForWeight,
} from './postageRates'
import { useCombinationPreferences } from './useCombinationPreferences'
import { safeExecute } from './useErrorHandler'

/**
 * 郵資組合計算器
 * 提供郵資計算和郵票組合建議功能
 */
export function usePostageCombinator(stamps) {
  const selectedMailType = ref('')
  const weight = ref(0)
  const postage = ref(null)
  const errorMessage = ref('')
  const allStampCombinations = ref([])
  const calculatingCombinations = ref(false)
  const inventoryOnly = ref(false)

  // 計算 ID，用於避免競態條件
  let currentCalculationId = 0

  const {
    combinationUsage,
    combinationFavorites,
    recordCombinationUsage,
    toggleCombinationFavorite,
    getCombinationStats,
    clearCurrentPostagePreferences,
    clearAllPreferences,
    generateCombinationKey,
  } = useCombinationPreferences()

  /**
   * 是否可以進行計算
   * @returns {boolean} 是否滿足計算條件
   */
  const canCalculate = computed(() => {
    return selectedMailType.value && weight.value > 0
  })

  /**
   * 處理所有組合：去重並標準化，加入偏好資訊
   * @returns {Array} 處理後的組合陣列
   */
  const processedCombinations = computed(() => {
    if (!allStampCombinations.value.length) return []

    return safeExecute(
      () => {
        const uniqueCombinations = []
        const seenKeys = new Set()

        allStampCombinations.value.forEach(combo => {
          if (inventoryOnly.value && !combinationFitsInventory(combo, stamps?.value || [])) return
          const sortedStamps = combo.slice().sort((a, b) => b - a)
          const comboKey = sortedStamps.join(',')

          if (!seenKeys.has(comboKey)) {
            seenKeys.add(comboKey)

            const fullKey = generateCombinationKey(sortedStamps, postage.value)
            const usageCount = combinationUsage.value[fullKey] || 0
            const isFavorite = combinationFavorites.value[fullKey] || false

            uniqueCombinations.push({
              stamps: sortedStamps,
              count: combo.length,
              uniqueDenominationsCount: new Set(combo).size,
              comboKey,
              fullKey,
              usageCount,
              isFavorite,
              preferenceScore: (isFavorite ? 1000 : 0) + usageCount * 10,
            })
          }
        })

        return uniqueCombinations
      },
      [],
      '處理組合'
    )
  })

  function combinationFitsInventory(combo, inventory) {
    const available = new Map(
      inventory.map(stamp => [stamp.denomination, stamp.remainingCount || 0])
    )
    return combo.every(denomination => {
      const count = available.get(denomination) || 0
      if (count <= 0) return false
      available.set(denomination, count - 1)
      return true
    })
  }

  /**
   * 張數最少組合（內部計算）- 考慮使用者偏好
   * @returns {Array} 張數最少的組合陣列
   */
  const fewestStampsCombinationsInternal = computed(() => {
    return safeExecute(
      () => {
        const combinations = [...processedCombinations.value]

        combinations.sort((a, b) => {
          if (a.preferenceScore !== b.preferenceScore) {
            return b.preferenceScore - a.preferenceScore
          }
          if (a.count !== b.count) {
            return a.count - b.count
          }
          return compareStampArrays(a.stamps, b.stamps)
        })

        return combinations.slice(0, POSTAGE_CONFIG.MAX_COMBINATIONS_TO_SHOW)
      },
      [],
      '計算張數最少組合'
    )
  })

  /**
   * 種類最少組合（內部計算）- 考慮使用者偏好
   * @returns {Array} 種類最少的組合陣列
   */
  const fewestDenominationsCombinationsInternal = computed(() => {
    return safeExecute(
      () => {
        const combinations = [...processedCombinations.value]

        combinations.sort((a, b) => {
          if (a.preferenceScore !== b.preferenceScore) {
            return b.preferenceScore - a.preferenceScore
          }
          if (a.uniqueDenominationsCount !== b.uniqueDenominationsCount) {
            return a.uniqueDenominationsCount - b.uniqueDenominationsCount
          }
          if (a.count !== b.count) {
            return a.count - b.count
          }
          return compareStampArrays(a.stamps, b.stamps)
        })

        return combinations.slice(0, POSTAGE_CONFIG.MAX_COMBINATIONS_TO_SHOW)
      },
      [],
      '計算種類最少組合'
    )
  })

  /**
   * 產生顏色映射表
   * @returns {Object} 顏色映射物件
   */
  const comboColorMap = computed(() => {
    return safeExecute(
      () => {
        const map = {}
        let colorIndex = 0

        // 收集兩個列表的組合鍵值
        const fsKeys = new Set(fewestStampsCombinationsInternal.value.map(c => c.comboKey))
        const fdKeys = new Set(fewestDenominationsCombinationsInternal.value.map(c => c.comboKey))

        // 只為同時出現在兩個列表中的組合分配顏色
        const commonKeys = [...fsKeys].filter(key => fdKeys.has(key))
        for (const key of commonKeys) {
          map[key] = HIGHLIGHT_COLORS[colorIndex % HIGHLIGHT_COLORS.length]
          colorIndex++
        }

        return map
      },
      {},
      '產生顏色映射'
    )
  })

  /**
   * 最終顯示組合（包含背景色）
   * @returns {Array} 張數最少組合（含背景色）
   */
  const fewestStampsCombinations = computed(() => {
    return addBackgroundColors(fewestStampsCombinationsInternal.value)
  })

  /**
   * 最終顯示組合（包含背景色）
   * @returns {Array} 種類最少組合（含背景色）
   */
  const fewestDenominationsCombinations = computed(() => {
    return addBackgroundColors(fewestDenominationsCombinationsInternal.value)
  })

  /**
   * 比較郵票陣列排序
   * @param {Array} arrayA - 第一個陣列
   * @param {Array} arrayB - 第二個陣列
   * @returns {number} 比較結果
   */
  function compareStampArrays(arrayA, arrayB) {
    const minLength = Math.min(arrayA.length, arrayB.length)
    for (let i = 0; i < minLength; i++) {
      if (arrayA[i] !== arrayB[i]) {
        return arrayB[i] - arrayA[i]
      }
    }
    return arrayA.length - arrayB.length
  }

  /**
   * 為組合添加背景顏色
   * @param {Array} combinations - 組合陣列
   * @returns {Array} 含背景色的組合陣列
   */
  function addBackgroundColors(combinations) {
    return combinations.map(combo => ({
      ...combo,
      bgColor: comboColorMap.value[combo.comboKey] || 'bg-white border-slate-200',
    }))
  }

  /**
   * 驗證輸入參數
   * @returns {string|null} 錯誤訊息或 null
   */
  function validateInputData() {
    if (!selectedMailType.value) {
      return '請選擇郵件種類'
    }

    const weightValue = parseFloat(weight.value)
    if (isNaN(weightValue)) {
      return '請輸入有效的重量數字'
    }

    if (weightValue <= 0) {
      return '重量必須大於 0'
    }

    const rateConfig = POSTAGE_RATES[selectedMailType.value]
    if (rateConfig && weightValue > rateConfig.maxWeight) {
      return `${rateConfig.name}重量不得超過 ${formatWeightLimit(rateConfig.maxWeight)}`
    }

    return null
  }

  /**
   * 根據重量和郵件類型計算郵資
   */
  function calculatePostageAmount(mailTypeKey, weightValue) {
    const rateConfig = POSTAGE_RATES[mailTypeKey]
    if (!rateConfig) {
      throw new Error('無效的郵件類型')
    }

    // 檢查重量限制
    if (weightValue > rateConfig.maxWeight) {
      throw new Error(`${rateConfig.name}重量不得超過 ${formatWeightLimit(rateConfig.maxWeight)}`)
    }

    const calculatedPostage = calculatePostageForWeight(rateConfig, weightValue)
    if (calculatedPostage === null) throw new Error('無法計算郵資')
    return calculatedPostage
  }

  function formatWeightLimit(maxWeight) {
    return maxWeight >= 1000 ? `${maxWeight / 1000} 公斤` : `${maxWeight} 公克`
  }

  /**
   * 回溯算法核心函數
   */
  function backtrackCombinations(
    targetAmount,
    currentAmount,
    startIndex,
    currentCombo,
    denominations,
    results,
    uniqueResultsKeys,
    startTime,
    iterationCount,
    maxIterations
  ) {
    iterationCount.value++

    // 效能控制：如果計算時間過長或迭代次數過多，停止計算
    if (
      Date.now() - startTime > POSTAGE_CONFIG.MAX_CALCULATION_TIME ||
      iterationCount.value > maxIterations
    ) {
      return iterationCount.value
    }

    if (currentAmount === 0) {
      const sortedCombo = currentCombo.slice().sort((x, y) => y - x)
      const comboKey = sortedCombo.join(',')

      if (!uniqueResultsKeys.has(comboKey)) {
        uniqueResultsKeys.add(comboKey)
        results.push(sortedCombo)

        // 限制結果數量，避免記憶體過度使用
        if (results.length > 1000) {
          return iterationCount.value
        }
      }
      return iterationCount.value
    }

    if (currentAmount < 0 || startIndex >= denominations.length) {
      return iterationCount.value
    }

    // 剪枝：組合過長
    if (currentCombo.length >= POSTAGE_CONFIG.MAX_COMBINATION_LENGTH) {
      return iterationCount.value
    }

    // 剪枝：如果當前最小面額都無法湊成剩餘金額，直接返回
    const minDenomination = denominations[denominations.length - 1]
    if (currentAmount < minDenomination) {
      return iterationCount.value
    }

    // 使用當前面額
    currentCombo.push(denominations[startIndex])
    iterationCount.value = backtrackCombinations(
      targetAmount,
      currentAmount - denominations[startIndex],
      startIndex,
      currentCombo,
      denominations,
      results,
      uniqueResultsKeys,
      startTime,
      iterationCount,
      maxIterations
    )
    currentCombo.pop()

    // 不使用當前面額，嘗試下一個
    iterationCount.value = backtrackCombinations(
      targetAmount,
      currentAmount,
      startIndex + 1,
      currentCombo,
      denominations,
      results,
      uniqueResultsKeys,
      startTime,
      iterationCount,
      maxIterations
    )

    return iterationCount.value
  }

  /**
   * 使用回溯算法尋找郵票組合
   */
  function findStampCombinations(targetAmount) {
    try {
      const denominations = STAMP_DENOMINATIONS.slice().sort((a, b) => b - a)
      const results = []
      const uniqueResultsKeys = new Set()
      const startTime = Date.now()
      const iterationCount = { value: 0 }
      const maxIterations = 50000 // 限制最大迭代次數

      const finalIterationCount = backtrackCombinations(
        targetAmount,
        targetAmount,
        0,
        [],
        denominations,
        results,
        uniqueResultsKeys,
        startTime,
        iterationCount,
        maxIterations
      )

      allStampCombinations.value = results

      const totalTime = Date.now() - startTime

      // 效能報告
      if (totalTime > POSTAGE_CONFIG.MAX_CALCULATION_TIME || finalIterationCount > maxIterations) {
        console.warn(
          `郵票組合計算受限：耗時 ${totalTime}ms，迭代 ${finalIterationCount} 次，找到 ${results.length} 個組合`
        )
      }

      // 記憶體清理
      uniqueResultsKeys.clear()
    } catch (error) {
      console.error('計算郵票組合時發生錯誤:', error)
      allStampCombinations.value = []
    }
  }

  // === 主要方法 ===

  /**
   * 選擇郵件類型
   */
  function selectMailType(type) {
    try {
      selectedMailType.value = type
      resetCalculationResults()
    } catch (error) {
      console.error('選擇郵件類型時發生錯誤:', error)
    }
  }

  /**
   * 重設計算結果
   */
  function resetCalculationResults() {
    postage.value = null
    errorMessage.value = ''
    allStampCombinations.value = []
    calculatingCombinations.value = false
    // 重設計算 ID，取消所有進行中的計算
    currentCalculationId++
  }

  /**
   * 計算郵資並尋找組合
   */
  function calculatePostage() {
    try {
      resetCalculationResults()

      // 輸入驗證
      const validationError = validateInputData()
      if (validationError) {
        errorMessage.value = validationError
        return
      }

      const weightValue = parseFloat(weight.value)

      // 計算郵資
      const calculatedPostage = calculatePostageAmount(selectedMailType.value, weightValue)

      if (calculatedPostage > 0) {
        postage.value = calculatedPostage
        calculatingCombinations.value = true

        // 產生新的計算 ID
        const calculationId = ++currentCalculationId

        // 異步計算組合，避免阻塞 UI
        setTimeout(() => {
          try {
            // 檢查是否為最新的計算請求
            if (calculationId === currentCalculationId) {
              findStampCombinations(calculatedPostage)
              // 再次檢查，確保沒有新的計算請求
              if (calculationId === currentCalculationId) {
                calculatingCombinations.value = false
              }
            }
          } catch (error) {
            console.error('異步計算組合時發生錯誤:', error)
            if (calculationId === currentCalculationId) {
              calculatingCombinations.value = false
              errorMessage.value = '計算郵票組合時發生錯誤'
            }
          }
        }, 0)
      } else {
        errorMessage.value = '無法計算郵資，請檢查輸入'
      }
    } catch (error) {
      console.error('計算郵資時發生錯誤:', error)
      errorMessage.value = error.message || '計算郵資時發生錯誤'
      calculatingCombinations.value = false
    }
  }

  /**
   * 格式化郵票組合顯示
   */
  function getFormattedStamps(combination) {
    try {
      const counts = {}
      combination.forEach(stamp => {
        counts[stamp] = (counts[stamp] || 0) + 1
      })

      return Object.entries(counts)
        .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
        .map(([value, count]) => ({
          value: parseInt(value),
          count,
        }))
    } catch (error) {
      console.error('格式化郵票組合時發生錯誤:', error)
      return []
    }
  }

  // === 返回值 ===
  return {
    // 響應式數據
    selectedMailType,
    weight,
    postage,
    errorMessage,
    calculatingCombinations,
    inventoryOnly,
    // 計算屬性
    canCalculate,
    fewestStampsCombinations,
    fewestDenominationsCombinations,

    // 方法
    selectMailType,
    calculatePostage,
    getFormattedStamps,

    // 偏好管理方法
    recordCombinationUsage,
    toggleCombinationFavorite,
    getCombinationStats,
    clearCurrentPostagePreferences: () => clearCurrentPostagePreferences(postage.value),
    clearAllPreferences,
  }
}
