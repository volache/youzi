import { STAMP_DENOMINATIONS } from '../config/stampCatalog.js'

export { STAMP_DENOMINATIONS }

export const POSTAGE_RATE_METADATA = Object.freeze({
  sourceUrl: 'https://www.post.gov.tw/post/internet/Postal/index.jsp?ID=2020106',
  effectiveDate: '2019-11-01',
  verifiedDate: '2026-09-06',
})

export const POSTAGE_CONFIG = Object.freeze({
  MAX_COMBINATIONS_TO_SHOW: 5,
  MAX_COMBINATION_LENGTH: 20,
  MAX_CALCULATION_TIME: 5000,
  WEIGHT_LIMITS: Object.freeze({
    LETTER: 20000,
    PRINTED_MATTER: 2000,
  }),
})

const LETTER_RATES = Object.freeze([
  { maxWeight: 20, cost: 8 },
  { maxWeight: 50, cost: 16 },
  { maxWeight: 100, cost: 24 },
  { maxWeight: 250, cost: 40 },
  { maxWeight: 500, cost: 72 },
  { maxWeight: 1000, cost: 112 },
  { maxWeight: 2000, cost: 160 },
])

const PRINTED_MATTER_RATES = Object.freeze([
  { maxWeight: 20, cost: 6 },
  { maxWeight: 50, cost: 6 },
  { maxWeight: 100, cost: 11 },
  { maxWeight: 250, cost: 16 },
  { maxWeight: 500, cost: 32 },
  { maxWeight: 1000, cost: 56 },
  { maxWeight: 2000, cost: 88 },
])

function addSurcharge(rates, surcharge) {
  return rates.map(rate => ({ ...rate, cost: rate.cost + surcharge }))
}

function createLetterRate(name, surcharge = 0) {
  return {
    name,
    maxWeight: POSTAGE_CONFIG.WEIGHT_LIMITS.LETTER,
    additionalRateStartWeight: 2000,
    additionalRatePerKg: 48,
    rates: addSurcharge(LETTER_RATES, surcharge),
  }
}

export const POSTAGE_RATES = Object.freeze({
  ordinary_letter: createLetterRate('普通信函'),
  registered_letter: createLetterRate('普通掛號', 20),
  registered_return_receipt_letter: createLetterRate('普通掛號附回執', 35),
  express_letter: createLetterRate('限時信函', 7),
  express_registered_letter: createLetterRate('限時掛號', 27),
  express_registered_return_receipt_letter: createLetterRate('限時掛號附回執', 42),
  ordinary_printed_matter: {
    name: '普通印刷物',
    maxWeight: POSTAGE_CONFIG.WEIGHT_LIMITS.PRINTED_MATTER,
    rates: PRINTED_MATTER_RATES.map(rate => ({ ...rate })),
  },
})

export function calculatePostageForWeight(rateConfig, weightValue) {
  if (!rateConfig || !Number.isFinite(weightValue) || weightValue <= 0) return null
  if (weightValue > rateConfig.maxWeight) return null

  const matchedRate = rateConfig.rates.find(rate => weightValue <= rate.maxWeight)
  if (matchedRate) return matchedRate.cost

  if (rateConfig.additionalRatePerKg && weightValue > rateConfig.additionalRateStartWeight) {
    const baseCost = rateConfig.rates.at(-1).cost
    const additionalWeight = weightValue - rateConfig.additionalRateStartWeight
    return baseCost + Math.ceil(additionalWeight / 1000) * rateConfig.additionalRatePerKg
  }

  return null
}

export const HIGHLIGHT_COLORS = Object.freeze([
  'bg-blue-100 border-blue-300',
  'bg-green-100 border-green-300',
  'bg-yellow-100 border-yellow-300',
  'bg-purple-100 border-purple-300',
  'bg-pink-100 border-pink-300',
])
