<template>
  <div class="lg:col-span-8 card card-hover p-6">
    <!-- 統計日期和操作按鈕區域 -->
    <div class="flex justify-between items-center mb-4">
      <!-- 左側：統計日期 -->
      <div class="flex items-center space-x-4">
        <div class="flex items-center space-x-2">
          <label for="calcStatDate" class="text-sm font-medium text-slate-700 whitespace-nowrap"
            >統計日期</label
          >
          <input
            type="date"
            id="calcStatDate"
            :value="statisticsDate"
            @input="$emit('update:statistics-date', $event.target.value)"
            class="input text-sm"
          />
        </div>
      </div>

      <!-- 右側：操作按鈕 -->
      <div class="flex items-center space-x-3">
        <!-- 重設按鈕（無論何時都顯示） -->
        <button
          @click="$emit('reset-purchases')"
          class="hidden md:flex items-center btn bg-secondary-100 hover:bg-secondary-200 text-secondary-700 focus:ring-secondary-500 text-sm transition-all duration-200"
        >
          <AppIcon name="restore" class="mr-2" size="1.25rem" />
          重設採購規劃張數
        </button>

        <!-- 查看最近採購建議按鈕（只在有報告數據時顯示） -->
        <button
          v-if="hasReportData"
          @click="$emit('show-latest-report')"
          class="hidden md:flex items-center btn bg-emerald-500 hover:bg-emerald-600 text-white focus:ring-emerald-500 text-sm transition-all duration-200"
        >
          <AppIcon name="file-document-outline" class="mr-2" size="1.25rem" />
          查看最近採購建議
        </button>

        <!-- 系統建議採購組合按鈕（沒有報告數據時顯示） -->
        <button
          v-if="!hasReportData"
          @click="$emit('suggest-optimal-purchases')"
          :disabled="purchasableAmount <= 0 && allStampsMeetMinStock"
          class="hidden md:flex items-center btn-success text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <AppIcon name="check-circle" class="mr-2" size="1.25rem" />
          系統建議採購組合
        </button>
      </div>
    </div>

    <div class="table-container">
      <div class="table-title">
        <h4 class="table-title-text">郵票庫存與採購明細</h4>
      </div>
      <div class="overflow-x-auto custom-scrollbar">
        <table class="table">
          <thead>
            <tr>
              <th class="table-header text-center border-r border-slate-200">面額<br />（NT$）</th>
              <th class="table-header text-right border-r border-slate-200">剩餘郵票<br />張數</th>
              <th class="table-header text-right border-r border-slate-200">剩餘郵票<br />金額</th>
              <th class="table-header text-right border-r border-slate-200">規劃採購<br />張數</th>
              <th class="table-header text-right border-r border-slate-200">規劃採購<br />金額</th>
              <th class="table-header text-right border-r border-slate-200">合計<br />張數</th>
              <th class="table-header text-right">合計<br />金額</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-slate-200">
            <tr
              v-for="stamp in stamps"
              :key="stamp.denomination"
              class="table-row hover:bg-slate-50 transition-colors"
            >
              <td
                class="table-cell text-base font-medium text-primary-600 text-center border-r border-slate-200"
              >
                {{ stamp.denomination }}
              </td>
              <td class="table-cell text-right border-r border-slate-200">
                <input
                  type="number"
                  v-model.number="stamp.remainingCount"
                  min="0"
                  step="1"
                  @input="$emit('sanitize-int-input', stamp, 'remainingCount', $event)"
                  class="table-input w-24 text-right"
                />
              </td>
              <td class="table-cell text-base text-slate-600 text-right border-r border-slate-200">
                {{ formatNumber(stamp.denomination * (stamp.remainingCount || 0)) }}
              </td>
              <td class="table-cell border-r border-slate-200">
                <div class="flex items-center justify-end gap-2">
                  <input
                    type="number"
                    v-model.number="stamp.purchaseCount"
                    min="0"
                    step="1"
                    :disabled="stamp.purchaseMode === 'fixed'"
                    @input="$emit('sanitize-int-input', stamp, 'purchaseCount', $event)"
                    class="table-input w-24 text-right disabled:cursor-not-allowed disabled:border-primary-200 disabled:bg-primary-50 disabled:text-primary-800"
                  />
                  <button
                    @click="togglePurchaseLock(stamp)"
                    :title="
                      stamp.purchaseMode === 'fixed' ? '解除鎖定，交由系統規劃' : '鎖定目前規劃張數'
                    "
                    :aria-label="
                      stamp.purchaseMode === 'fixed' ? '解除採購張數鎖定' : '鎖定採購張數'
                    "
                    class="rounded-md p-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400"
                    :class="
                      stamp.purchaseMode === 'fixed'
                        ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                        : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                    "
                  >
                    <AppIcon
                      :name="stamp.purchaseMode === 'fixed' ? 'lock-outline' : 'lock-open-outline'"
                      size="1rem"
                    />
                  </button>
                </div>
              </td>
              <td class="table-cell text-base text-slate-600 text-right border-r border-slate-200">
                {{ formatNumber(stamp.denomination * (stamp.purchaseCount || 0)) }}
              </td>
              <td
                class="table-cell text-base font-semibold text-slate-700 text-right border-r border-slate-200"
              >
                {{ formatNumber((stamp.remainingCount || 0) + (stamp.purchaseCount || 0)) }}
              </td>
              <td class="table-cell text-base font-semibold text-slate-700 text-right">
                {{
                  formatNumber(
                    stamp.denomination * ((stamp.remainingCount || 0) + (stamp.purchaseCount || 0))
                  )
                }}
              </td>
            </tr>
          </tbody>
          <tfoot class="table-footer">
            <tr>
              <td
                class="table-cell text-center text-base font-semibold text-slate-800 border-r border-slate-200"
              >
                總計
              </td>
              <td
                class="table-cell text-base font-bold text-slate-800 text-right border-r border-slate-200"
              >
                {{ formatNumber(totalRemainingCount) }}
              </td>
              <td
                class="table-cell text-base font-bold text-slate-800 text-right border-r border-slate-200"
              >
                {{ formatNumber(totalRemainingValue) }}
              </td>
              <td
                class="table-cell text-base font-bold text-slate-800 text-right border-r border-slate-200"
              >
                {{ formatNumber(totalPlannedPurchaseCount) }}
              </td>
              <td
                class="table-cell text-base font-bold text-slate-800 text-right border-r border-slate-200"
              >
                {{ formatNumber(totalPlannedPurchaseValue) }}
              </td>
              <td
                class="table-cell text-base font-bold text-slate-800 text-right border-r border-slate-200"
              >
                {{ formatNumber(totalStampCount) }}
              </td>
              <td class="table-cell text-base font-bold text-slate-800 text-right">
                {{ formatNumber(totalStampValue) }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- 移動端按鈕區域 -->
    <div class="block md:hidden mt-6 space-y-3">
      <!-- 重設按鈕（移動端，無論何時都顯示） -->
      <button
        @click="$emit('reset-purchases')"
        class="w-full btn bg-secondary-100 hover:bg-secondary-200 text-secondary-700 focus:ring-secondary-500"
      >
        <AppIcon name="restore" class="mr-2" size="1.25rem" />
        重設
      </button>

      <!-- 查看最近報告按鈕（移動端，只在有報告數據時顯示） -->
      <button
        v-if="hasReportData"
        @click="$emit('show-latest-report')"
        class="w-full btn bg-emerald-500 hover:bg-emerald-600 text-white focus:ring-emerald-500"
      >
        <AppIcon name="file-document-outline" class="mr-2" size="1.25rem" />
        查看最近的採購建議報告
      </button>

      <!-- 系統自動建議採購組合按鈕（移動端，沒有報告數據時顯示） -->
      <button
        v-if="!hasReportData"
        @click="$emit('suggest-optimal-purchases')"
        :disabled="purchasableAmount <= 0 && allStampsMeetMinStock"
        class="w-full btn-success disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <AppIcon name="check-circle" class="mr-2" size="1.25rem" />
        系統自動建議採購組合
      </button>
    </div>
  </div>
</template>

<script setup>
import { useUtils } from '../composables/useUtils'
import { togglePurchaseLock } from '../composables/purchasePlanning'
import AppIcon from './AppIcon.vue'

defineProps({
  stamps: Array,
  totalRemainingCount: Number,
  totalRemainingValue: Number,
  totalPlannedPurchaseCount: Number,
  totalPlannedPurchaseValue: Number,
  totalStampCount: Number,
  totalStampValue: Number,
  purchasableAmount: Number,
  allStampsMeetMinStock: Boolean,
  hasReportData: Boolean,
  statisticsDate: String,
})

defineEmits([
  'suggest-optimal-purchases',
  'sanitize-int-input',
  'show-latest-report',
  'reset-purchases',
  'update:statistics-date',
])

const { formatNumber } = useUtils()
</script>
