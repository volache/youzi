<template>
  <Transition name="modal-fade">
    <div v-if="show" class="modal-overlay">
      <Transition name="modal-content-fade">
        <div
          v-if="show"
          :class="modalContentClass"
          role="dialog"
          aria-modal="true"
          aria-labelledby="advanced-settings-title"
        >
          <ModalHeader
            title="採購規則設定"
            title-id="advanced-settings-title"
            title-class="text-primary-600"
            fullscreen-enabled
            :is-fullscreen="isFullscreen"
            @toggle-fullscreen="toggleFullscreen"
            @close="$emit('close')"
          />

          <div class="modal-body">
            <p class="text-slate-600 text-sm mb-4">
              <span class="font-semibold text-primary-700"
                >當前模式：{{ currentRuleModeDisplay }}</span
              ><br />
              設定每種面額的最低庫存張數，以及在採購數量中預期的相對重要性（系統將自動正規化其總和）。
            </p>

            <!-- 全螢幕模式布局 -->
            <div v-if="isFullscreen" class="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <!-- 左欄：採購規則設定表格 -->
              <div class="table-container">
                <div class="overflow-x-auto custom-scrollbar">
                  <table class="table">
                    <thead>
                      <tr>
                        <th class="table-header text-center border-r border-slate-200">
                          面額（NT$）
                        </th>
                        <th class="table-header text-center border-r border-slate-200">
                          最低庫存張數
                        </th>
                        <th class="table-header text-center border-r border-slate-200">
                          優先級（數字越小越優先）
                        </th>
                        <th class="table-header text-center">歷史平均採購比例（權重值）</th>
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-slate-200">
                      <tr
                        v-for="stamp in stamps"
                        :key="'advanced_settings_' + stamp.denomination"
                        class="table-row hover:bg-slate-50 transition-colors"
                      >
                        <td
                          class="table-cell text-base font-medium text-primary-600 text-center border-r border-slate-200"
                        >
                          {{ stamp.denomination }}
                        </td>
                        <td class="table-cell text-center border-r border-slate-200">
                          <input
                            type="number"
                            v-model.number="stamp.minStock"
                            min="0"
                            step="1"
                            @input="handleIntegerInput(stamp, 'minStock', $event)"
                            class="table-input w-24 text-center"
                          />
                        </td>
                        <td class="table-cell text-center border-r border-slate-200">
                          <input
                            type="number"
                            v-model.number="stamp.priority"
                            min="0"
                            step="1"
                            @input="handleIntegerInput(stamp, 'priority', $event)"
                            class="table-input w-24 text-center"
                          />
                        </td>
                        <td class="table-cell text-center">
                          <input
                            type="number"
                            :value="getIdealProportion(stamp.denomination).toFixed(2)"
                            @input="handleProportionInput(stamp.denomination, $event)"
                            min="0"
                            step="0.01"
                            class="table-input w-32 text-right"
                          />
                        </td>
                      </tr>
                    </tbody>
                    <tfoot class="table-footer">
                      <tr>
                        <td
                          class="table-cell text-center text-base font-semibold text-slate-800 border-r border-slate-200"
                        >
                          總和
                        </td>
                        <td class="table-cell text-center border-r border-slate-200"></td>
                        <td class="table-cell text-center border-r border-slate-200"></td>
                        <td class="table-cell text-base font-bold text-slate-800 text-center">
                          {{ totalProportionSum.toFixed(2) }}
                          <span
                            :class="{
                              'text-danger-500': totalProportionSum === 0,
                              'text-success-600': totalProportionSum > 0,
                            }"
                            >（系統將正規化）</span
                          >
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <!-- 右欄：預算設定 + 圖表區域 -->
              <div class="space-y-4">
                <!-- 上排：圓餅圖 + 預算設定 -->
                <div class="grid grid-cols-2 gap-4">
                  <!-- 圓餅圖 -->
                  <div class="bg-slate-50 p-6 rounded-lg border border-slate-200">
                    <h4 class="text-xl font-semibold text-slate-700 mb-6 flex items-center">
                      採購比例分布
                    </h4>
                    <div class="flex flex-col items-center">
                      <!-- 圓餅圖容器 -->
                      <div class="mb-6">
                        <svg
                          width="200"
                          height="200"
                          viewBox="0 0 200 200"
                          class="transform -rotate-90"
                        >
                          <!-- 背景圓圈 -->
                          <circle
                            cx="100"
                            cy="100"
                            r="80"
                            fill="none"
                            stroke="#e2e8f0"
                            stroke-width="20"
                          />
                          <!-- 動態生成的圓餅圖片段 -->
                          <g
                            v-for="segment in pieChartSegments"
                            :key="'pie-' + segment.denomination"
                          >
                            <circle
                              cx="100"
                              cy="100"
                              r="80"
                              fill="none"
                              :stroke="segment.color"
                              stroke-width="20"
                              :stroke-dasharray="segment.dashArray"
                              :stroke-dashoffset="segment.dashOffset"
                              class="transition-all duration-500 hover:opacity-80"
                              pathLength="100"
                            />
                          </g>
                        </svg>
                      </div>
                      <!-- 圖例 - 每五個一列 -->
                      <div class="w-full grid grid-cols-5 gap-x-4 gap-y-2 text-sm">
                        <div
                          v-for="segment in pieChartSegments"
                          :key="'legend-' + segment.denomination"
                          class="flex items-center"
                        >
                          <div
                            class="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                            :style="{ backgroundColor: segment.color }"
                          ></div>
                          <span class="text-slate-700 text-xs">
                            {{ segment.denomination }}元<br />
                            ({{ segment.percentage.toFixed(1) }}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- 預算設定 -->
                  <div class="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <h4 class="text-xl font-semibold text-slate-700 mb-3">預算設定</h4>
                    <div>
                      <label
                        for="monthlyBudgetModal"
                        class="block text-sm font-medium text-slate-700 mb-1"
                        >每月預算（NT$）</label
                      >
                      <input
                        type="number"
                        id="monthlyBudgetModal"
                        :value="monthlyBudget"
                        @input="$emit('update:monthly-budget', parseInt($event.target.value) || 0)"
                        min="0"
                        step="1"
                        placeholder="例如：7000"
                        class="input text-sm w-full"
                      />
                    </div>
                  </div>
                </div>

                <!-- 下排：長條圖 -->
                <div class="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <h4 class="text-xl font-semibold text-slate-700 mb-4 flex items-center">
                    優先級分布（數字越小越優先）
                  </h4>
                  <div class="space-y-2">
                    <div
                      v-for="stamp in sortedStampsByPriority"
                      :key="'priority-' + stamp.denomination"
                      class="flex items-center"
                    >
                      <div class="w-10 text-xs font-medium text-slate-700">
                        {{ stamp.denomination }}元
                      </div>
                      <div class="flex-1 mx-2">
                        <div class="bg-slate-200 rounded-full h-5 relative overflow-hidden">
                          <div
                            class="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-1"
                            :class="getPriorityBarColor(stamp.priority)"
                            :style="{ width: getPriorityBarWidth(stamp.priority) + '%' }"
                          >
                            <span class="text-xs font-semibold text-white">{{
                              stamp.priority
                            }}</span>
                          </div>
                        </div>
                      </div>
                      <div class="w-12 text-xs text-slate-600">
                        {{ getPriorityLabel(stamp.priority) }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 非全螢幕模式：原有布局 -->
            <div v-else>
              <!-- 每月預算設定 -->
              <div class="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
                <h4 class="text-lg font-semibold text-slate-700 mb-3">預算設定</h4>
                <div>
                  <label
                    for="monthlyBudgetModal"
                    class="block text-sm font-medium text-slate-700 mb-1"
                    >每月預算（NT$）</label
                  >
                  <input
                    type="number"
                    id="monthlyBudgetModal"
                    :value="monthlyBudget"
                    @input="$emit('update:monthly-budget', parseInt($event.target.value) || 0)"
                    min="0"
                    step="1"
                    placeholder="例如：7000"
                    class="input text-sm w-full max-w-xs"
                  />
                </div>
              </div>

              <div class="table-container">
                <div class="overflow-x-auto custom-scrollbar">
                  <table class="table">
                    <thead>
                      <tr>
                        <th class="table-header text-center border-r border-slate-200">
                          面額（NT$）
                        </th>
                        <th class="table-header text-center border-r border-slate-200">
                          最低庫存張數
                        </th>
                        <th class="table-header text-center border-r border-slate-200">
                          優先級（數字越小越優先）
                        </th>
                        <th class="table-header text-center">歷史平均採購比例（權重值）</th>
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-slate-200">
                      <tr
                        v-for="stamp in stamps"
                        :key="'advanced_settings_' + stamp.denomination"
                        class="table-row hover:bg-slate-50 transition-colors"
                      >
                        <td
                          class="table-cell text-base font-medium text-primary-600 text-center border-r border-slate-200"
                        >
                          {{ stamp.denomination }}
                        </td>
                        <td class="table-cell text-center border-r border-slate-200">
                          <input
                            type="number"
                            v-model.number="stamp.minStock"
                            min="0"
                            step="1"
                            @input="handleIntegerInput(stamp, 'minStock', $event)"
                            class="table-input w-24 text-center"
                          />
                        </td>
                        <td class="table-cell text-center border-r border-slate-200">
                          <input
                            type="number"
                            v-model.number="stamp.priority"
                            min="0"
                            step="1"
                            @input="handleIntegerInput(stamp, 'priority', $event)"
                            class="table-input w-24 text-center"
                          />
                        </td>
                        <td class="table-cell text-center">
                          <input
                            type="number"
                            :value="getIdealProportion(stamp.denomination).toFixed(2)"
                            @input="handleProportionInput(stamp.denomination, $event)"
                            min="0"
                            step="0.01"
                            class="table-input w-32 text-right"
                          />
                        </td>
                      </tr>
                    </tbody>
                    <tfoot class="table-footer">
                      <tr>
                        <td
                          class="table-cell text-center text-base font-semibold text-slate-800 border-r border-slate-200"
                        >
                          總和
                        </td>
                        <td class="table-cell text-center border-r border-slate-200"></td>
                        <td class="table-cell text-center border-r border-slate-200"></td>
                        <td class="table-cell text-base font-bold text-slate-800 text-center">
                          {{ totalProportionSum.toFixed(2) }}
                          <span
                            :class="{
                              'text-danger-500': totalProportionSum === 0,
                              'text-success-600': totalProportionSum > 0,
                            }"
                            >（系統將正規化）</span
                          >
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <!-- 視覺化圖表區域（僅在非全螢幕模式顯示） -->
              <div class="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- 比例分布圓餅圖 -->
                <div class="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <h4 class="text-lg font-semibold text-slate-700 mb-4 flex items-center">
                    <AppIcon name="chart-donut" class="mr-2 text-primary-600" size="1.25rem" />
                    採購比例分布
                  </h4>
                  <div class="relative">
                    <!-- 圓餅圖容器 -->
                    <div class="flex justify-center mb-4">
                      <svg
                        width="200"
                        height="200"
                        viewBox="0 0 200 200"
                        class="transform -rotate-90"
                      >
                        <!-- 背景圓圈 -->
                        <circle
                          cx="100"
                          cy="100"
                          r="80"
                          fill="none"
                          stroke="#e2e8f0"
                          stroke-width="20"
                        />
                        <!-- 動態生成的圓餅圖片段 -->
                        <g v-for="segment in pieChartSegments" :key="'pie-' + segment.denomination">
                          <circle
                            cx="100"
                            cy="100"
                            r="80"
                            fill="none"
                            :stroke="segment.color"
                            stroke-width="20"
                            :stroke-dasharray="segment.dashArray"
                            :stroke-dashoffset="segment.dashOffset"
                            class="transition-all duration-500 hover:opacity-80"
                            pathLength="100"
                          />
                        </g>
                      </svg>
                    </div>
                    <!-- 圖例 -->
                    <div class="grid grid-cols-2 gap-4 text-sm">
                      <!-- 左欄 -->
                      <div class="space-y-2">
                        <div
                          v-for="segment in pieChartSegments.slice(0, 5)"
                          :key="'legend-left-' + segment.denomination"
                          class="flex items-center"
                        >
                          <div
                            class="w-3 h-3 rounded-full mr-2"
                            :style="{ backgroundColor: segment.color }"
                          ></div>
                          <span class="text-slate-700 text-xs">
                            {{ segment.denomination }}元<br />
                            ({{ segment.percentage.toFixed(1) }}%)
                          </span>
                        </div>
                      </div>
                      <!-- 右欄 -->
                      <div class="space-y-2">
                        <div
                          v-for="segment in pieChartSegments.slice(5)"
                          :key="'legend-right-' + segment.denomination"
                          class="flex items-center"
                        >
                          <div
                            class="w-3 h-3 rounded-full mr-2"
                            :style="{ backgroundColor: segment.color }"
                          ></div>
                          <span class="text-slate-700 text-xs">
                            {{ segment.denomination }}元<br />
                            ({{ segment.percentage.toFixed(1) }}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 優先級條形圖 -->
                <div class="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <h4 class="text-lg font-semibold text-slate-700 mb-4 flex items-center">
                    <AppIcon name="chart-bar" class="mr-2 text-warning-600" size="1.25rem" />
                    優先級分布（數字越小越優先）
                  </h4>
                  <div class="space-y-3">
                    <div
                      v-for="stamp in sortedStampsByPriority"
                      :key="'priority-' + stamp.denomination"
                      class="flex items-center"
                    >
                      <div class="w-12 text-sm font-medium text-slate-700">
                        {{ stamp.denomination }}元
                      </div>
                      <div class="flex-1 mx-3">
                        <div class="bg-slate-200 rounded-full h-6 relative overflow-hidden">
                          <div
                            class="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                            :class="getPriorityBarColor(stamp.priority)"
                            :style="{ width: getPriorityBarWidth(stamp.priority) + '%' }"
                          >
                            <span class="text-xs font-semibold text-white">{{
                              stamp.priority
                            }}</span>
                          </div>
                        </div>
                      </div>
                      <div class="w-16 text-sm text-slate-600">
                        {{ getPriorityLabel(stamp.priority) }}
                      </div>
                    </div>
                  </div>
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
                @click="$emit('reset-advanced-settings', 'basic')"
                class="btn bg-secondary-100 hover:bg-secondary-200 text-secondary-700 focus:ring-secondary-500 text-sm"
              >
                重設為基本預設值
              </button>
              <button
                @click="$emit('reset-advanced-settings', 'dynamic')"
                class="btn bg-secondary-100 hover:bg-secondary-200 text-secondary-700 focus:ring-secondary-500 text-sm"
              >
                依歷史數據重新計算
              </button>
              <button @click="$emit('close')" class="btn-primary text-sm">關閉</button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import ModalHeader from './ModalHeader.vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  show: Boolean,
  stamps: Array,
  idealProportions: Array,
  currentRuleModeDisplay: String,
  totalProportionSum: Number,
  monthlyBudget: Number,
})

const emit = defineEmits([
  'close',
  'reset-advanced-settings',
  'update-rule-mode',
  'sanitize-int-input',
  'sanitize-proportion-input',
  'update:monthly-budget',
])

// 全螢幕狀態
const isFullscreen = ref(false)

// 計算屬性：模態視窗內容樣式
const modalContentClass = computed(() => {
  const baseClass = 'modal-content'
  if (isFullscreen.value) {
    return `${baseClass} w-screen h-screen max-w-none max-h-none m-0 rounded-none`
  }
  return `${baseClass} max-w-3xl`
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
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

const getIdealProportion = denomination => {
  const prop = props.idealProportions.find(p => p.denomination === denomination)
  return prop ? prop.proportion : 0
}

const getIdealProportionObj = denomination => {
  return props.idealProportions.find(p => p.denomination === denomination)
}

const handleIntegerInput = (stamp, field, event) => {
  emit('update-rule-mode')
  emit('sanitize-int-input', stamp, field, event)
}

const handleProportionInput = (denomination, event) => {
  const proportion = getIdealProportionObj(denomination)
  if (!proportion) return

  emit('update-rule-mode')
  emit('sanitize-proportion-input', proportion, event)
}

const getPriorityColor = denomination => {
  const priority = props.stamps.find(stamp => stamp.denomination === denomination)?.priority || 0
  if (priority <= 1) return '#ef4444'
  if (priority <= 3) return '#f97316'
  if (priority <= 5) return '#eab308'
  if (priority <= 7) return '#22c55e'
  return '#3b82f6'
}

const pieChartSegments = computed(() => {
  const total = props.idealProportions.reduce(
    (sum, item) => sum + (Number(item.proportion) || 0),
    0
  )
  if (total <= 0) return []

  let offset = 0
  return props.idealProportions
    .filter(item => Number(item.proportion) > 0)
    .map(item => {
      const percentage = (Number(item.proportion) / total) * 100
      const segment = {
        denomination: item.denomination,
        percentage,
        color: getPriorityColor(item.denomination),
        dashArray: `${percentage} ${100 - percentage}`,
        dashOffset: -offset,
      }
      offset += percentage
      return segment
    })
})

// 按優先級排序的郵票
const sortedStampsByPriority = computed(() => {
  if (!props.stamps) return []
  return [...props.stamps].sort((a, b) => (a.priority || 0) - (b.priority || 0))
})

// 優先級條形圖寬度計算
const getPriorityBarWidth = priority => {
  if (!props.stamps) return 0
  const maxPriority = Math.max(...props.stamps.map(s => s.priority || 0))
  if (maxPriority === 0) return 100
  // 反向計算：優先級越小，條形越長
  return Math.max(10, 100 - ((priority || 0) / maxPriority) * 80)
}

// 優先級條形圖顏色
const getPriorityBarColor = priority => {
  const p = priority || 0
  if (p <= 1) return 'bg-red-500'
  if (p <= 3) return 'bg-orange-500'
  if (p <= 5) return 'bg-yellow-500'
  if (p <= 7) return 'bg-green-500'
  return 'bg-blue-500'
}

// 優先級標籤
const getPriorityLabel = priority => {
  const p = priority || 0
  if (p <= 1) return '最高'
  if (p <= 3) return '高'
  if (p <= 5) return '中'
  if (p <= 7) return '低'
  return '最低'
}
</script>
