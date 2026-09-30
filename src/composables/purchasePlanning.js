export const PURCHASE_MODE = Object.freeze({
  AUTO: 'auto',
  FIXED: 'fixed',
})

export function normalizePurchaseMode(mode) {
  return mode === PURCHASE_MODE.FIXED ? PURCHASE_MODE.FIXED : PURCHASE_MODE.AUTO
}

export function normalizePurchaseCount(value, max = 1000000) {
  const count = Math.floor(Number(value))
  return Number.isFinite(count) ? Math.min(max, Math.max(0, count)) : 0
}

export function getPreservedPurchaseCount(stamp) {
  return normalizePurchaseMode(stamp?.purchaseMode) === PURCHASE_MODE.FIXED
    ? normalizePurchaseCount(stamp?.fixedPurchaseCount)
    : 0
}

export function togglePurchaseLock(stamp) {
  if (normalizePurchaseMode(stamp.purchaseMode) === PURCHASE_MODE.FIXED) {
    stamp.purchaseMode = PURCHASE_MODE.AUTO
    stamp.fixedPurchaseCount = 0
    return
  }

  const lockedCount = normalizePurchaseCount(stamp.purchaseCount)
  stamp.purchaseMode = PURCHASE_MODE.FIXED
  stamp.fixedPurchaseCount = lockedCount
  stamp.purchaseCount = lockedCount
}
