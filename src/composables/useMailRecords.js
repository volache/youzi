import { ref, computed } from 'vue'

const emptyRecord = (sentDate = new Date().toISOString().slice(0, 10)) => ({
  id: '',
  status: 'pending',
  sentDate,
  sender: '',
  referenceNumber: '',
  recipient: '',
  recipientAddress: '',
  mailType: '',
  weight: null,
  postage: null,
  trackingNumber: '',
  stampCombination: [],
  notes: '',
  createdAt: '',
  confirmedAt: '',
  cancelledAt: '',
  cancellationReason: '',
  stockReturned: false,
})

function normalizeCombination(combination) {
  if (!Array.isArray(combination)) return []
  return combination
    .map(item => ({
      denomination: Number(item.denomination),
      count: Math.floor(Number(item.count)),
    }))
    .filter(item => Number.isFinite(item.denomination) && item.denomination > 0 && item.count > 0)
}

export function useMailRecords({ stamps }) {
  const mailRecords = ref([])
  const stampInventoryTransactions = ref([])
  const editingMailRecord = ref(emptyRecord())

  const sortedMailRecords = computed(() =>
    [...mailRecords.value].sort((a, b) =>
      `${b.sentDate}${b.createdAt}`.localeCompare(`${a.sentDate}${a.createdAt}`)
    )
  )

  const beginNewRecord = sentDate => {
    editingMailRecord.value = emptyRecord(sentDate)
  }

  const startEditRecord = record => {
    editingMailRecord.value = JSON.parse(JSON.stringify(record))
  }

  const validateRecord = record => {
    if (!record.sentDate) return '請填寫寄件日期'
    if (!record.mailType) return '請選擇郵寄方式'
    if (!record.sender?.trim()) return '請填寫寄件者（單位）'
    if (!record.recipient?.trim()) return '請填寫收件者'
    if (!record.postage || Number(record.postage) <= 0) return '請先計算或輸入郵資'
    if (!normalizeCombination(record.stampCombination).length) return '請選擇郵票面額組合'
    const combinationAmount = normalizeCombination(record.stampCombination).reduce(
      (total, item) => total + item.denomination * item.count,
      0
    )
    if (combinationAmount !== Number(record.postage)) return '郵票面額組合必須剛好等於郵資'
    if (requiresTracking(record.mailType) && !record.trackingNumber?.trim())
      return '此郵件種類需要填寫掛號號碼'
    return ''
  }

  const savePending = record => {
    const normalized = normalizeRecord(record)
    const existing = mailRecords.value.find(item => item.id === normalized.id)
    if (existing && existing.status !== 'pending') throw new Error('已寄出或已取消紀錄不可再編輯')
    normalized.status = 'pending'
    upsertRecord(normalized)
    return normalized
  }

  const confirmRecord = record => {
    const message = validateRecord(record)
    if (message) throw new Error(message)
    const normalized = normalizeRecord(record)
    const existing = mailRecords.value.find(item => item.id === normalized.id)

    if (existing && existing.status !== 'pending') throw new Error('僅待寄出紀錄可確認寄出')
    assertStock(normalized.stampCombination)
    applyStock(normalized.stampCombination, -1)
    normalized.status = 'sent'
    normalized.confirmedAt = new Date().toISOString()
    upsertRecord(normalized)
    stampInventoryTransactions.value.unshift({
      id: crypto.randomUUID(),
      recordId: normalized.id,
      occurredAt: normalized.confirmedAt,
      type: 'mailing_debit',
      combination: normalized.stampCombination,
    })
    return normalized
  }

  const confirmRecords = ids => {
    const idSet = new Set(ids)
    const targets = mailRecords.value.filter(record => idSet.has(record.id))
    if (!targets.length) throw new Error('請先選擇待寄出紀錄')
    if (targets.some(record => record.status !== 'pending')) {
      throw new Error('批次確認僅限待寄出紀錄')
    }

    targets.forEach(record => {
      const message = validateRecord(record)
      if (message) throw new Error(`「${record.recipient || '未填收件者'}」：${message}`)
    })

    const requiredCombination = new Map()
    targets.forEach(record => {
      record.stampCombination.forEach(item => {
        requiredCombination.set(
          item.denomination,
          (requiredCombination.get(item.denomination) || 0) + item.count
        )
      })
    })
    assertStock([...requiredCombination].map(([denomination, count]) => ({ denomination, count })))

    const occurredAt = new Date().toISOString()
    targets.forEach(record => {
      applyStock(record.stampCombination, -1)
      record.status = 'sent'
      record.confirmedAt = occurredAt
      stampInventoryTransactions.value.unshift({
        id: crypto.randomUUID(),
        recordId: record.id,
        occurredAt,
        type: 'mailing_debit',
        combination: record.stampCombination,
      })
    })
    return targets
  }

  const cancelRecord = (id, { reason, returnStock }) => {
    const target = mailRecords.value.find(record => record.id === id)
    if (!target) throw new Error('找不到要取消的郵寄紀錄')
    if (target.status !== 'sent') throw new Error('僅已寄出紀錄可使用取消／作廢流程')
    if (!reason?.trim()) throw new Error('請填寫取消原因')

    const occurredAt = new Date().toISOString()
    if (returnStock) {
      applyStock(target.stampCombination, 1)
      stampInventoryTransactions.value.unshift({
        id: crypto.randomUUID(),
        recordId: target.id,
        occurredAt,
        type: 'mailing_credit',
        combination: target.stampCombination,
      })
    }
    target.status = 'cancelled'
    target.cancelledAt = occurredAt
    target.cancellationReason = reason.trim()
    target.stockReturned = Boolean(returnStock)
    return target
  }

  const deletePending = id => {
    const target = mailRecords.value.find(record => record.id === id)
    if (!target) return
    if (target.status !== 'pending') throw new Error('僅待寄出紀錄可刪除')
    mailRecords.value = mailRecords.value.filter(record => record.id !== id)
  }

  function requiresTracking(type) {
    return [
      'registered_letter',
      'registered_return_receipt_letter',
      'express_registered_letter',
      'express_registered_return_receipt_letter',
      'double_registered',
    ].includes(type)
  }

  function normalizeRecord(record) {
    const now = new Date().toISOString()
    return {
      ...emptyRecord(),
      ...JSON.parse(JSON.stringify(record)),
      id: record.id || crypto.randomUUID(),
      postage: Number(record.postage),
      weight: record.weight === null || record.weight === '' ? null : Number(record.weight),
      stampCombination: normalizeCombination(record.stampCombination),
      createdAt: record.createdAt || now,
    }
  }

  function upsertRecord(record) {
    const index = mailRecords.value.findIndex(item => item.id === record.id)
    if (index === -1) mailRecords.value.unshift(record)
    else mailRecords.value[index] = record
  }

  function assertStock(combination) {
    for (const item of combination) {
      const stamp = stamps.value.find(value => value.denomination === item.denomination)
      if (!stamp || stamp.remainingCount < item.count) {
        throw new Error(`${item.denomination} 元郵票庫存不足`)
      }
    }
  }

  function applyStock(combination, multiplier) {
    combination.forEach(item => {
      const stamp = stamps.value.find(value => value.denomination === item.denomination)
      stamp.remainingCount += item.count * multiplier
    })
  }

  return {
    mailRecords,
    stampInventoryTransactions,
    editingMailRecord,
    sortedMailRecords,
    beginNewRecord,
    startEditRecord,
    savePending,
    confirmRecord,
    confirmRecords,
    cancelRecord,
    deletePending,
    requiresTracking,
  }
}
