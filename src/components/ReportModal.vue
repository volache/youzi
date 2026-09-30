<template>
  <Transition name="modal-fade">
    <div v-if="show" class="modal-overlay">
      <Transition name="modal-content-fade">
        <div
          v-if="show"
          :class="modalContentClass"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-title"
        >
          <ModalHeader
            title="採購建議報告"
            title-id="report-title"
            title-class="text-primary-600"
            fullscreen-enabled
            :is-fullscreen="isFullscreen"
            @toggle-fullscreen="toggleFullscreen"
            @close="$emit('close')"
          />

          <div v-if="reportData" class="modal-body text-slate-700 space-y-8">
            <!-- 總覽資訊 -->
            <div
              class="bg-gradient-to-r from-primary-50 to-blue-50 p-6 rounded-xl border border-primary-200 shadow-sm"
            >
              <h4 class="text-xl font-bold text-primary-700 mb-4 flex items-center">
                <AppIcon name="chart-bar" class="mr-2" size="1.5rem" />
                採購總覽
              </h4>
              <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div class="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                  <p class="text-sm text-slate-600 mb-1">初始可用預算</p>
                  <p class="text-2xl font-bold text-primary-600">
                    {{ formatNumber(reportData.initialPurchasableAmount) }}
                  </p>
                  <p class="text-xs text-slate-500">元</p>
                </div>
                <div class="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                  <p class="text-sm text-slate-600 mb-1">總採購張數</p>
                  <p class="text-2xl font-bold text-success-600">{{ getTotalPurchases() }}</p>
                  <p class="text-xs text-slate-500">張</p>
                </div>
                <div class="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                  <p class="text-sm text-slate-600 mb-1">總花費金額</p>
                  <p class="text-2xl font-bold text-warning-600">
                    {{ formatNumber(getTotalSpent()) }}
                  </p>
                  <p class="text-xs text-slate-500">元</p>
                </div>
                <div class="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                  <p class="text-sm text-slate-600 mb-1">預算使用率</p>
                  <p class="text-2xl font-bold text-purple-600">
                    {{ getBudgetUsagePercentage() }}%
                  </p>
                  <div class="w-full bg-slate-200 rounded-full h-2 mt-2">
                    <div
                      class="bg-purple-600 h-2 rounded-full transition-all duration-500"
                      :style="{ width: getBudgetUsagePercentage() + '%' }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 採購流程視覺化 -->
            <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h4 class="text-xl font-bold text-slate-700 mb-6 flex items-center">
                <AppIcon name="lightning-bolt-outline" class="mr-2" size="1.5rem" />
                智能採購流程
              </h4>

              <!-- 流程步驟指示器 -->
              <div class="flex items-center justify-between mb-8 relative">
                <div class="absolute top-5 left-0 w-full h-0.5 bg-slate-200"></div>
                <div
                  class="absolute top-5 left-0 h-0.5 bg-primary-500 transition-all duration-1000"
                  :style="{ width: '100%' }"
                ></div>

                <div
                  v-for="(stage, index) in reportData.stages"
                  :key="'indicator-' + index"
                  class="relative flex flex-col items-center z-10"
                >
                  <div
                    class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm transition-all duration-500"
                    :class="getStageIndicatorClass(index)"
                  >
                    {{ index + 1 }}
                  </div>
                  <p class="text-xs text-slate-600 mt-2 text-center max-w-20">
                    {{ getStageShortName(stage.name) }}
                  </p>
                </div>
              </div>

              <!-- 詳細階段資訊 -->
              <div class="space-y-6">
                <div
                  v-for="(stage, index) in reportData.stages"
                  :key="'stage-detail-' + index"
                  class="border border-slate-200 rounded-lg overflow-hidden transition-all duration-300 hover:shadow-md"
                >
                  <!-- 階段標題 -->
                  <div class="bg-slate-50 p-4 cursor-pointer" @click="toggleStageDetail(index)">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center space-x-3">
                        <div
                          class="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                          :class="getStageIndicatorClass(index)"
                        >
                          {{ index + 1 }}
                        </div>
                        <div>
                          <h5 class="font-bold text-lg" :class="getStageTextClass(index)">
                            {{ stage.name }}
                          </h5>
                          <p class="text-sm text-slate-600">{{ getStageDescription(index) }}</p>
                        </div>
                      </div>
                      <div class="flex items-center space-x-4">
                        <div class="text-right">
                          <p class="text-sm text-slate-600">本階段成果</p>
                          <p class="font-bold text-lg" :class="getStageTextClass(index)">
                            {{ stage.totalPurchases }} 張 / {{ formatNumber(stage.totalSpent) }} 元
                          </p>
                        </div>
                        <AppIcon
                          name="chevron-down"
                          class="text-slate-400 transition-transform duration-200"
                          :class="{ 'rotate-180': expandedStages.includes(index) }"
                          size="1.25rem"
                        />
                      </div>
                    </div>
                  </div>

                  <!-- 階段詳細內容 -->
                  <Transition name="stage-detail">
                    <div
                      v-if="expandedStages.includes(index)"
                      class="p-6 bg-white border-t border-slate-200"
                    >
                      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <!-- 階段統計 -->
                        <div class="space-y-4">
                          <h6 class="font-semibold text-slate-700 mb-3">階段統計</h6>
                          <div class="grid grid-cols-2 gap-4">
                            <div class="bg-slate-50 p-3 rounded-lg">
                              <p class="text-xs text-slate-600">採購張數</p>
                              <p class="text-lg font-bold text-slate-700">
                                {{ stage.totalPurchases }} 張
                              </p>
                            </div>
                            <div class="bg-slate-50 p-3 rounded-lg">
                              <p class="text-xs text-slate-600">花費金額</p>
                              <p class="text-lg font-bold text-slate-700">
                                {{ formatNumber(stage.totalSpent) }} 元
                              </p>
                            </div>
                            <div class="bg-slate-50 p-3 rounded-lg">
                              <p class="text-xs text-slate-600">剩餘預算</p>
                              <p class="text-lg font-bold text-slate-700">
                                {{ formatNumber(stage.remainingBudget) }} 元
                              </p>
                            </div>
                            <div class="bg-slate-50 p-3 rounded-lg">
                              <p class="text-xs text-slate-600">預算使用</p>
                              <p class="text-lg font-bold text-slate-700">
                                {{ getStageUsagePercentage(stage) }}%
                              </p>
                            </div>
                          </div>
                        </div>

                        <!-- 階段說明 -->
                        <div class="space-y-4">
                          <h6 class="mb-3 flex items-center gap-2 font-semibold text-slate-700">
                            <AppIcon name="lightbulb-on-outline" size="1.1rem" />
                            階段說明
                          </h6>
                          <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <p class="text-sm text-blue-800 leading-relaxed">
                              {{ getStageExplanation(index) }}
                            </p>
                          </div>

                          <!-- 階段採購明細 -->
                          <div v-if="getStageDetails(index).length > 0">
                            <h6 class="font-semibold text-slate-700 mb-2">本階段採購明細</h6>
                            <div class="space-y-2">
                              <div
                                v-for="detail in getStageDetails(index)"
                                :key="detail.denomination"
                                class="flex justify-between items-center p-2 bg-slate-50 rounded"
                              >
                                <span class="font-medium">{{ detail.denomination }} 元</span>
                                <span class="text-sm text-slate-600">{{ detail.count }} 張</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Transition>
                </div>
              </div>
            </div>

            <!-- 採購明細表格 -->
            <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div
                class="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200"
              >
                <h4 class="text-xl font-bold text-slate-700 flex items-center">
                  <AppIcon name="table" class="mr-2" size="1.5rem" />
                  採購明細分析
                </h4>
              </div>
              <div class="overflow-x-auto custom-scrollbar">
                <table class="table">
                  <thead>
                    <tr>
                      <th class="table-header text-center border-r border-slate-200">
                        面額（NT$）
                      </th>
                      <th class="table-header text-right border-r border-slate-200">初始庫存</th>
                      <th class="table-header text-right border-r border-slate-200">建議採購</th>
                      <th class="table-header text-right border-r border-slate-200">採購後庫存</th>
                      <th class="table-header text-right border-r border-slate-200">採購金額</th>
                      <th class="table-header text-center border-r border-slate-200">
                        滿足最低庫存
                      </th>
                      <th class="table-header text-right border-r border-slate-200">庫存價值</th>
                      <th class="table-header text-right border-r border-slate-200">理想比例</th>
                      <th class="table-header text-right border-r border-slate-200">實際比例</th>
                      <th class="table-header text-right border-r border-slate-200">
                        比例差異（%）
                      </th>
                      <th class="table-header text-center">採購效率</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-slate-200">
                    <tr
                      v-for="detail in getPurchaseDetails()"
                      :key="detail.denomination"
                      class="table-row hover:bg-slate-50 transition-colors"
                    >
                      <td
                        class="table-cell text-base font-medium text-primary-600 text-center border-r border-slate-200"
                      >
                        {{ detail.denomination }}
                      </td>
                      <td
                        class="table-cell text-base text-slate-600 text-right border-r border-slate-200"
                      >
                        {{ detail.initialStock }}
                      </td>
                      <td
                        class="table-cell text-base font-semibold text-slate-700 text-right border-r border-slate-200"
                      >
                        {{ detail.purchaseCount }}
                      </td>
                      <td
                        class="table-cell text-base font-semibold text-slate-700 text-right border-r border-slate-200"
                      >
                        {{ detail.finalStock }}
                      </td>
                      <td
                        class="table-cell text-base text-slate-600 text-right border-r border-slate-200"
                      >
                        {{ formatNumber(detail.purchaseAmount) }}
                      </td>
                      <td class="table-cell text-center border-r border-slate-200">
                        <span
                          v-if="detail.meetsMinStock"
                          class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success-100 text-success-800"
                        >
                          <AppIcon name="check-bold" class="mr-1" size="0.8rem" />
                          滿足
                        </span>
                        <span
                          v-else
                          class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-danger-100 text-danger-800"
                        >
                          <AppIcon name="alert-circle-outline" class="mr-1" size="0.8rem" />
                          不足
                        </span>
                      </td>
                      <td
                        class="table-cell text-base text-slate-600 text-right border-r border-slate-200"
                      >
                        {{ formatNumber(detail.stockValue) }}
                      </td>
                      <td
                        class="table-cell text-base text-slate-600 text-right border-r border-slate-200"
                      >
                        {{ detail.idealProportion }}%
                      </td>
                      <td
                        class="table-cell text-base text-slate-600 text-right border-r border-slate-200"
                      >
                        {{ detail.actualProportion }}%
                      </td>
                      <td
                        class="table-cell text-base text-right border-r border-slate-200"
                        :class="getProportionDifferenceClass(detail.proportionDifference)"
                      >
                        {{ detail.proportionDifference > 0 ? '+' : ''
                        }}{{ detail.proportionDifference }}%
                      </td>
                      <td class="table-cell text-center">
                        <span
                          class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                          :class="getPurchaseEfficiencyClass(detail.purchaseEfficiency)"
                        >
                          {{ detail.purchaseEfficiency }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                  <tfoot class="bg-slate-100">
                    <tr>
                      <td
                        class="table-cell text-center text-base font-semibold text-slate-800 border-r border-slate-200"
                      >
                        總計
                      </td>
                      <td
                        class="table-cell text-base font-bold text-slate-800 text-right border-r border-slate-200"
                      >
                        {{ getTotalInitialStock() }}
                      </td>
                      <td
                        class="table-cell text-base font-bold text-slate-800 text-right border-r border-slate-200"
                      >
                        {{ getTotalPurchases() }}
                      </td>
                      <td
                        class="table-cell text-base font-bold text-slate-800 text-right border-r border-slate-200"
                      >
                        {{ getTotalFinalStock() }}
                      </td>
                      <td
                        class="table-cell text-base font-bold text-slate-800 text-right border-r border-slate-200"
                      >
                        {{ formatNumber(getTotalSpent()) }}
                      </td>
                      <td class="table-cell text-center border-r border-slate-200">
                        <span
                          class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-info-100 text-info-800"
                        >
                          {{ getOverallMinStockStatus() }}
                        </span>
                      </td>
                      <td
                        class="table-cell text-base font-bold text-slate-800 text-right border-r border-slate-200"
                      >
                        {{ formatNumber(getTotalStockValue()) }}
                      </td>
                      <td colspan="4" class="table-cell text-center text-sm text-slate-500">
                        平均效率: {{ getAveragePurchaseEfficiency() }}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <!-- 最終結果 -->
            <div
              class="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200 shadow-sm"
            >
              <div class="flex items-start space-x-4">
                <div class="flex-shrink-0">
                  <AppIcon name="check-circle-outline" class="text-green-600" size="2rem" />
                </div>
                <div class="flex-1">
                  <h4 class="text-lg font-bold text-green-800 mb-2">採購建議完成</h4>
                  <p class="text-base font-semibold text-green-700">
                    最終剩餘預算：<span class="text-primary-600"
                      >{{ formatNumber(reportData.finalRemainingBudget) }} 元</span
                    >
                  </p>
                  <p class="text-sm text-green-600 mt-2 leading-relaxed">
                    {{ reportData.finalMessage }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer flex justify-between items-center">
            <!-- 操作提示 -->
            <div class="text-xs text-slate-500 flex items-center space-x-1">
              <kbd class="px-2 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-mono"
                >F11</kbd
              >
              <span>或</span>
              <kbd class="px-2 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-mono"
                >Ctrl</kbd
              >
              <span>+</span>
              <kbd class="px-2 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-mono"
                >Enter</kbd
              >
              <span>切換全螢幕</span>
            </div>

            <div class="flex space-x-3">
              <button
                @click="$emit('copy-report')"
                class="btn bg-secondary-100 hover:bg-secondary-200 text-secondary-700 focus:ring-secondary-500 text-sm flex items-center space-x-2"
              >
                <AppIcon name="content-copy" size="1rem" />
                <span>複製報告</span>
              </button>
              <button
                @click="$emit('close')"
                class="btn-primary text-sm flex items-center space-x-2"
              >
                <AppIcon name="close" size="1rem" />
                <span>關閉</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useUtils } from '../composables/useUtils'
import ModalHeader from './ModalHeader.vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  show: Boolean,
  reportData: Object,
})

defineEmits(['close', 'copy-report'])

const { formatNumber } = useUtils()

// 全螢幕狀態
const isFullscreen = ref(false)

// 展開的階段詳情
const expandedStages = ref([])

// 計算屬性：模態視窗內容樣式
const modalContentClass = computed(() => {
  const baseClass = 'modal-content'
  if (isFullscreen.value) {
    return `${baseClass} w-screen h-screen max-w-none max-h-none m-0 rounded-none`
  }
  return `${baseClass} max-w-7xl`
})

// 全螢幕切換功能
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
}

// 鍵盤快捷鍵處理
const handleKeydown = event => {
  // F11 或 Ctrl+Enter 切換全螢幕
  if (event.key === 'F11' || (event.ctrlKey && event.key === 'Enter')) {
    event.preventDefault()
    toggleFullscreen()
  }
  // ESC 鍵退出全螢幕（如果在全螢幕模式）
  else if (event.key === 'Escape' && isFullscreen.value) {
    event.preventDefault()
    isFullscreen.value = false
  }
}

// 生命週期鉤子
onMounted(() => {
  // 確保事件監聽器只添加一次
  if (!document.reportModalKeydownListener) {
    document.addEventListener('keydown', handleKeydown)
    document.reportModalKeydownListener = true
  }
})

onUnmounted(() => {
  // 確保事件監聽器被正確移除
  document.removeEventListener('keydown', handleKeydown)
  document.reportModalKeydownListener = false
})

// 切換階段詳情展開/收合
const toggleStageDetail = index => {
  const expandedIndex = expandedStages.value.indexOf(index)
  if (expandedIndex > -1) {
    expandedStages.value.splice(expandedIndex, 1)
  } else {
    expandedStages.value.push(index)
  }
}

// 計算預算使用率
const getBudgetUsagePercentage = () => {
  if (!props.reportData?.initialPurchasableAmount) return 0
  const usedAmount = getTotalSpent()
  const percentage = (usedAmount / props.reportData.initialPurchasableAmount) * 100
  return Math.round(percentage * 10) / 10
}

// 計算階段預算使用率
const getStageUsagePercentage = stage => {
  if (!props.reportData?.initialPurchasableAmount || !stage.totalSpent) return 0
  const percentage = (stage.totalSpent / props.reportData.initialPurchasableAmount) * 100
  return Math.round(percentage * 10) / 10
}

// 獲取階段指示器樣式
const getStageIndicatorClass = index => {
  const classes = [
    'bg-blue-500 shadow-lg', // 階段一：藍色
    'bg-purple-500 shadow-lg', // 階段二：紫色
    'bg-orange-500 shadow-lg', // 階段三：橘色
  ]
  return classes[index] || 'bg-slate-400'
}

// 獲取階段文字樣式
const getStageTextClass = index => {
  const classes = [
    'text-blue-700', // 階段一
    'text-purple-700', // 階段二
    'text-orange-700', // 階段三
  ]
  return classes[index] || 'text-slate-700'
}

// 獲取階段簡短名稱
const getStageShortName = stageName => {
  if (stageName.includes('最低庫存')) return '最低庫存'
  if (stageName.includes('理想比例')) return '理想比例'
  if (stageName.includes('貪婪')) return '剩餘填補'
  return '未知階段'
}

// 獲取階段描述
const getStageDescription = index => {
  const descriptions = [
    '優先滿足各面額的最低庫存需求，確保基本營運需要',
    '根據設定的理想比例分配預算，平衡各面額庫存',
    '使用貪婪算法填補剩餘預算，優先購買高面額郵票',
  ]
  return descriptions[index] || '未知階段'
}

// 獲取階段詳細說明
const getStageExplanation = index => {
  const explanations = [
    '此階段會按照優先級順序，優先購買高優先級的郵票，確保每種面額都達到設定的最低庫存要求。這是採購的基礎階段，確保日常營運不會缺貨。',
    '在滿足最低庫存後，系統會根據您設定的理想比例來分配剩餘預算。使用迭代平衡算法，確保各面額的庫存比例盡可能接近理想狀態。',
    '最後階段使用貪婪算法處理剩餘的零頭預算。優先購買面額較高的郵票，以最大化剩餘預算的使用效率。',
  ]
  return explanations[index] || '未知階段說明'
}

// 獲取階段採購明細
const getStageDetails = index => {
  if (!props.reportData?.stages || !props.reportData.stages[index]) return []
  return props.reportData.stages[index].details || []
}

// 計算總採購張數
const getTotalPurchases = () => {
  return getPurchaseDetails().reduce((total, detail) => total + (detail.purchaseCount || 0), 0)
}

// 計算總花費金額
const getTotalSpent = () => {
  return getPurchaseDetails().reduce((total, detail) => total + (detail.purchaseAmount || 0), 0)
}

// 獲取採購明細
const getPurchaseDetails = () => {
  if (!props.reportData?.purchaseDetails) return []
  return props.reportData.purchaseDetails
}

// 計算總初始庫存
const getTotalInitialStock = () => {
  const details = getPurchaseDetails()
  return details.reduce((total, detail) => total + detail.initialStock, 0)
}

// 計算總最終庫存
const getTotalFinalStock = () => {
  const details = getPurchaseDetails()
  return details.reduce((total, detail) => total + detail.finalStock, 0)
}

// 獲取比例差異的樣式類別
const getProportionDifferenceClass = difference => {
  if (Math.abs(difference) < 0.5) return 'text-green-600'
  if (Math.abs(difference) < 2) return 'text-amber-600'
  return 'text-red-600'
}

// 獲取採購效率的樣式類別
const getPurchaseEfficiencyClass = efficiency => {
  switch (efficiency) {
    case '優秀':
      return 'bg-green-100 text-green-800'
    case '良好':
      return 'bg-blue-100 text-blue-800'
    case '普通':
      return 'bg-yellow-100 text-yellow-800'
    case '待改善':
      return 'bg-orange-100 text-orange-800'
    case '不佳':
      return 'bg-red-100 text-red-800'
    case '無採購':
      return 'bg-slate-100 text-slate-600'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

// 計算總庫存價值
const getTotalStockValue = () => {
  const details = getPurchaseDetails()
  return details.reduce((total, detail) => total + detail.stockValue, 0)
}

// 獲取整體最低庫存滿足狀況
const getOverallMinStockStatus = () => {
  const details = getPurchaseDetails()
  const totalStamps = details.length
  const satisfiedStamps = details.filter(detail => detail.meetsMinStock).length

  if (satisfiedStamps === totalStamps) return '全部滿足'
  if (satisfiedStamps === 0) return '全部不足'
  return `${satisfiedStamps}/${totalStamps} 滿足`
}

// 計算平均採購效率
const getAveragePurchaseEfficiency = () => {
  const details = getPurchaseDetails()
  const purchasedStamps = details.filter(detail => detail.purchaseCount > 0)

  if (purchasedStamps.length === 0) return '無採購'

  const efficiencyScores = {
    優秀: 95,
    良好: 85,
    普通: 75,
    待改善: 65,
    不佳: 50,
    無採購: 0,
  }

  const totalScore = purchasedStamps.reduce((sum, detail) => {
    return sum + (efficiencyScores[detail.purchaseEfficiency] || 0)
  }, 0)

  const averageScore = totalScore / purchasedStamps.length

  if (averageScore >= 90) return '優秀'
  if (averageScore >= 80) return '良好'
  if (averageScore >= 70) return '普通'
  if (averageScore >= 60) return '待改善'
  return '不佳'
}
</script>

<style scoped>
/* 階段詳情展開/收合動畫 */
.stage-detail-enter-active,
.stage-detail-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.stage-detail-enter-from,
.stage-detail-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
}

.stage-detail-enter-to,
.stage-detail-leave-from {
  opacity: 1;
  max-height: 500px;
  transform: translateY(0);
}

/* 進度條動畫 */
.progress-bar {
  transition: width 1s ease-in-out;
}

/* 懸停效果 */
.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}
</style>
