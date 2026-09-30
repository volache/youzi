/**
 * 郵票與採購規則的唯一資料來源。
 * 新增面額時只需修改此檔，畫面、匯入、組合計算會同步讀取。
 */
export const APP_DEFAULTS = Object.freeze({
  monthlyBudget: 7000,
  minStock: 10,
  unusedPriority: 999,
})

export const STAMP_DENOMINATIONS = Object.freeze([1, 5, 6, 8, 10, 12, 15, 20, 28, 35])

export const STAMP_CATALOG = Object.freeze(
  STAMP_DENOMINATIONS.map(denomination => Object.freeze({ denomination }))
)

export function createDefaultStamps() {
  return STAMP_CATALOG.map(({ denomination }) => ({
    denomination,
    remainingCount: 0,
    purchaseCount: 0,
    purchaseMode: 'auto',
    fixedPurchaseCount: 0,
    minStock: APP_DEFAULTS.minStock,
    priority: 0,
  }))
}

export function createDefaultIdealProportions() {
  return STAMP_CATALOG.map(({ denomination }) => ({ denomination, proportion: 0 }))
}

export function splitDenominationsForLegend() {
  const midpoint = Math.ceil(STAMP_DENOMINATIONS.length / 2)
  return [STAMP_DENOMINATIONS.slice(0, midpoint), STAMP_DENOMINATIONS.slice(midpoint)]
}
