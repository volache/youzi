<template>
  <div class="lg:col-span-4 card card-hover p-6 space-y-5">
    <h2 class="text-2xl font-semibold text-primary-600 border-b pb-3 mb-5">統計資訊</h2>

    <div class="stat-card bg-primary-50">
      <p class="stat-label text-primary-600">郵票總張數</p>
      <p class="stat-value text-primary-700">{{ formatNumber(totalStampCount) }} 張</p>
      <p class="stat-description">
        算式：<br />{{ formatNumber(totalRemainingCount) }}（剩餘郵票張數）+
        {{ formatNumber(totalPlannedPurchaseCount) }}（規劃採購張數）
      </p>
    </div>

    <div class="stat-card bg-success-50">
      <p class="stat-label text-success-600">剩餘郵票總金額</p>
      <p class="stat-value text-success-700">{{ formatNumber(totalRemainingValue) }} 元</p>
      <p class="stat-description break-all">
        算式：<br />
        <template v-for="(line, index) in remainingValueFormulaLines" :key="index">
          <span v-if="index > 0"><br />+</span>{{ line }}
        </template>
      </p>
    </div>

    <div class="stat-card bg-warning-50">
      <p class="stat-label text-warning-600">建議補足郵資</p>
      <p class="stat-value text-warning-700">{{ formatNumber(recommendedTopUpAmount) }} 元</p>
      <p class="stat-description">
        算式：<br />{{ formatNumber(monthlyBudget) }}（每月預算）-
        {{ formatNumber(totalRemainingValue) }}（剩餘金額）
      </p>
    </div>

    <div
      class="stat-card"
      :class="{ 'bg-secondary-50': purchasableAmount >= 0, 'bg-danger-50': purchasableAmount < 0 }"
    >
      <p
        class="stat-label"
        :class="{
          'text-secondary-600': purchasableAmount >= 0,
          'text-danger-600': purchasableAmount < 0,
        }"
      >
        {{ purchasableAmountLabel }}
      </p>
      <p
        class="stat-value"
        :class="{
          'text-secondary-700': purchasableAmount >= 0,
          'text-danger-700': purchasableAmount < 0,
        }"
      >
        {{ formatNumber(purchasableAmount) }} 元
      </p>
      <p class="stat-description">
        算式：<br />{{ formatNumber(recommendedTopUpAmount) }}（建議補足郵資）-
        {{ formatNumber(totalPlannedPurchaseValue) }}（規劃採購金額）
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useUtils } from '../composables/useUtils'

const props = defineProps({
  monthlyBudget: Number,
  totalStampCount: Number,
  totalRemainingCount: Number,
  totalPlannedPurchaseCount: Number,
  totalRemainingValue: Number,
  recommendedTopUpAmount: Number,
  purchasableAmount: Number,
  purchasableAmountLabel: String,
  totalPlannedPurchaseValue: Number,
  stamps: Array,
})

const { formatNumber } = useUtils()

// 格式化剩餘郵票總金額算式，在面額 10 元和 12 元之間斷行
const remainingValueFormulaLines = computed(() => {
  if (!props.stamps?.length) return []

  const firstLine = [] // 1元到10元
  const secondLine = [] // 12元到35元

  props.stamps.forEach(stamp => {
    const formula = `${formatNumber(stamp.denomination)}×${formatNumber(stamp.remainingCount || 0)}`
    if (stamp.denomination <= 10) {
      firstLine.push(formula)
    } else {
      secondLine.push(formula)
    }
  })

  return [firstLine.join('+'), secondLine.join('+')].filter(Boolean)
})
</script>
