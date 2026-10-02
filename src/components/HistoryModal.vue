<template>
  <Transition name="modal-fade">
    <div v-if="show" class="modal-overlay">
      <Transition name="modal-content-fade">
        <div
          v-if="show"
          :class="modalContentClass"
          role="dialog"
          aria-modal="true"
          aria-labelledby="history-title"
        >
          <ModalHeader
            title="歷史採購紀錄與入庫維護"
            title-id="history-title"
            title-class="text-fuchsia-600"
            fullscreen-enabled
            :is-fullscreen="isFullscreen"
            @toggle-fullscreen="toggleFullscreen"
            @close="$emit('close')"
          />

          <div class="modal-body">
            <!-- 操作按鈕區 -->
            <div class="mb-6 flex flex-wrap justify-between items-center gap-3">
              <div class="flex flex-wrap gap-3">
                <button
                  @click="$emit('export-history-csv')"
                  class="btn bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500 text-sm flex items-center"
                >
                  <AppIcon name="file-download-outline" class="mr-2" size="1.25rem" />
                  匯出 CSV
                </button>

                <button
                  @click="triggerFileInput"
                  class="btn bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 text-sm flex items-center"
                >
                  <AppIcon name="file-upload-outline" class="mr-2" size="1.25rem" />
                  匯入 CSV
                </button>

                <!-- 隱藏的檔案輸入 -->
                <input
                  ref="fileInput"
                  type="file"
                  accept=".csv"
                  @change="handleFileSelect"
                  class="hidden"
                />
              </div>

              <div class="flex flex-wrap gap-2">
                <button
                  v-if="!showAddForm && !showReceiptForm"
                  @click="showAddForm = true"
                  class="btn bg-fuchsia-600 hover:bg-fuchsia-700 text-white focus:ring-fuchsia-500 text-sm flex items-center"
                >
                  <AppIcon name="plus" class="mr-2" size="1.25rem" />
                  新增歷史紀錄
                </button>
                <button
                  v-if="!showReceiptForm && !showAddForm"
                  @click="startStockReceipt"
                  class="btn bg-teal-600 hover:bg-teal-700 text-white focus:ring-teal-500 text-sm flex items-center"
                >
                  <AppIcon name="plus" class="mr-2" size="1.25rem" />
                  郵票入庫
                </button>
              </div>
            </div>

            <!-- 新增/編輯紀錄表單 -->
            <Transition name="form-slide">
              <div
                v-if="showAddForm || editingRecord"
                class="mb-6 rounded-card border border-fuchsia-200 bg-fuchsia-50 p-4"
              >
                <div class="mb-4">
                  <h4 class="text-xl font-semibold text-fuchsia-800">
                    {{ editingRecord ? '編輯紀錄' : '新增紀錄' }}
                  </h4>
                  <p class="mt-1 text-sm text-fuchsia-700">
                    僅維護採購統計資料，不會變更現有庫存。
                  </p>
                </div>

                <!-- 月份輸入區域 -->
                <div class="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
                  <label class="block text-sm font-medium text-slate-700"
                    >登帳月份
                    <CustomDatePicker
                      :model-value="currentRecord.month"
                      mode="month"
                      @update:model-value="$emit('update-current-record-month', $event)"
                    />
                  </label>
                  <label class="block text-sm font-medium text-slate-700 md:col-span-3"
                    >備註（選填）
                    <input
                      :value="currentRecord.notes"
                      @input="$emit('update-current-record-notes', $event.target.value)"
                      class="input mt-1 h-[38px] w-full text-sm focus:border-fuchsia-500 focus:ring-fuchsia-500"
                    />
                  </label>
                </div>

                <!-- 郵票數量輸入 -->
                <div class="overflow-x-auto pb-1">
                  <div class="grid min-w-[660px] grid-cols-11 gap-2">
                    <div v-for="stamp in stamps" :key="'history-input-' + stamp.denomination">
                      <label
                        :for="'record-denom-' + stamp.denomination"
                        class="block text-sm font-medium text-slate-700"
                        >{{ stamp.denomination }} 元</label
                      >
                      <input
                        type="number"
                        :id="'record-denom-' + stamp.denomination"
                        :value="currentRecord.purchases[stamp.denomination]"
                        @input="
                          $emit(
                            'update-current-record-purchase',
                            stamp.denomination,
                            $event.target.value
                          )
                        "
                        min="0"
                        step="1"
                        class="input h-[38px] text-right text-sm focus:ring-fuchsia-500 focus:border-fuchsia-500"
                      />
                    </div>
                  </div>
                </div>
                <div class="mt-4 flex justify-end space-x-3">
                  <button
                    @click="$emit('save-history-record')"
                    class="btn bg-fuchsia-600 hover:bg-fuchsia-700 text-white focus:ring-fuchsia-500 text-sm"
                  >
                    {{ editingRecord ? '確認修改' : '確認新增' }}
                  </button>
                  <button
                    @click="cancelForm"
                    class="btn bg-secondary-100 hover:bg-secondary-200 text-secondary-700 focus:ring-secondary-500 text-sm"
                  >
                    取消
                  </button>
                </div>
              </div>
            </Transition>

            <!-- 實際入庫表單：只有確認後才會異動目前庫存。 -->
            <Transition name="form-slide">
              <div
                v-if="showReceiptForm"
                class="mb-6 rounded-card border border-teal-200 bg-teal-50 p-4"
              >
                <div class="mb-4 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h4 class="text-xl font-semibold text-teal-800">郵票入庫</h4>
                    <p class="mt-1 text-sm text-teal-700">
                      確認入庫後才會增加現有庫存，並累加到登帳月份的歷史採購紀錄。
                    </p>
                  </div>
                  <div class="rounded-lg border border-teal-200 bg-white px-3 py-2 text-right">
                    <p class="text-xs text-slate-500">本次實收入庫</p>
                    <p class="font-semibold text-teal-800">
                      {{ receiptTotalCount }} 張／NT$ {{ formatNumber(receiptTotalValue) }}
                    </p>
                  </div>
                </div>

                <div class="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <label class="text-sm font-medium text-slate-700"
                    >入庫日期<CustomDatePicker v-model="stockReceipt.receivedDate"
                  /></label>
                  <label class="text-sm font-medium text-slate-700"
                    >登帳月份<CustomDatePicker
                      v-model="stockReceipt.postingMonth"
                      mode="month"
                    /> </label
                  ><label class="text-sm font-medium text-slate-700"
                    >憑證／採購單號（選填）<input
                      v-model="stockReceipt.receiptNumber"
                      class="input mt-1 h-[38px] w-full text-sm focus:border-teal-500 focus:ring-teal-500"
                    /> </label
                  ><label class="text-sm font-medium text-slate-700"
                    >備註（選填）<input
                      v-model="stockReceipt.notes"
                      class="input mt-1 h-[38px] w-full text-sm focus:border-teal-500 focus:ring-teal-500"
                    />
                  </label>
                </div>

                <div class="mt-4 overflow-x-auto pb-1">
                  <div class="grid min-w-[660px] grid-cols-11 gap-2">
                    <div v-for="stamp in stamps" :key="'receipt-denom-' + stamp.denomination">
                      <label
                        :for="'receipt-denom-' + stamp.denomination"
                        class="block text-sm font-medium text-slate-700"
                        >{{ stamp.denomination }} 元</label
                      >
                      <input
                        :id="'receipt-denom-' + stamp.denomination"
                        v-model.number="stockReceipt.purchases[stamp.denomination]"
                        type="number"
                        min="0"
                        step="1"
                        class="input mt-1 h-[38px] w-full text-right text-sm focus:border-teal-500 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                </div>

                <div class="mt-4 flex justify-end space-x-3">
                  <button
                    @click="confirmStockReceipt"
                    :disabled="!canConfirmStockReceipt"
                    class="btn bg-teal-600 hover:bg-teal-700 text-sm text-white focus:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    確認入庫
                  </button>
                  <button
                    @click="cancelStockReceipt"
                    class="btn bg-secondary-100 hover:bg-secondary-200 text-secondary-700 focus:ring-secondary-500 text-sm"
                  >
                    取消
                  </button>
                </div>
              </div>
            </Transition>

            <div class="table-container">
              <div class="overflow-x-auto custom-scrollbar">
                <table class="table">
                  <thead>
                    <tr>
                      <th
                        class="table-header text-center border-r border-slate-200"
                        :class="isFullscreen ? 'w-32' : ''"
                      >
                        月份
                      </th>
                      <th
                        v-for="stamp in stamps"
                        :key="'history-header-' + stamp.denomination"
                        class="table-header text-right border-r border-slate-200"
                        :class="isFullscreen ? 'w-24' : 'w-20'"
                      >
                        {{ stamp.denomination }} 元
                      </th>
                      <th class="table-header text-center" :class="isFullscreen ? 'w-32' : ''">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-slate-200">
                    <tr v-if="monthlyPostageRecords.length === 0">
                      <td
                        :colspan="stamps.length + 2"
                        class="table-cell text-center text-slate-500 py-8"
                      >
                        尚無歷史紀錄，請新增
                      </td>
                    </tr>
                    <tr
                      v-for="(record, index) in monthlyPostageRecords"
                      :key="record.month"
                      class="table-row hover:bg-slate-50 transition-colors"
                    >
                      <td
                        class="table-cell font-medium text-center border-r border-slate-200"
                        :class="isFullscreen ? 'w-32' : ''"
                      >
                        {{ formatMonthDisplay(record.month) }}
                      </td>
                      <td
                        v-for="stamp in stamps"
                        :key="'history-cell-' + record.month + '-' + stamp.denomination"
                        class="table-cell text-right border-r border-slate-200"
                        :class="isFullscreen ? 'w-24' : 'w-20'"
                      >
                        {{ record.purchases[stamp.denomination] || 0 }}
                      </td>
                      <td class="table-cell text-center" :class="isFullscreen ? 'w-32' : ''">
                        <button
                          @click="startEdit(record)"
                          class="text-fuchsia-600 hover:text-fuchsia-800 text-sm font-medium mr-2 transition-colors duration-200"
                        >
                          編輯
                        </button>
                        <button
                          @click="$emit('delete-history-record', index)"
                          class="text-danger-600 hover:text-danger-800 text-sm font-medium transition-colors duration-200"
                        >
                          刪除
                        </button>
                      </td>
                    </tr>
                  </tbody>
                  <tfoot class="table-footer">
                    <tr>
                      <td
                        class="table-cell text-center text-base font-semibold text-slate-800 border-r border-slate-200"
                        :class="isFullscreen ? 'w-32' : ''"
                      >
                        每月平均採購張數
                      </td>
                      <td
                        v-for="stamp in stamps"
                        :key="'avg-foot-' + stamp.denomination"
                        class="table-cell text-right text-base font-bold text-slate-800 border-r border-slate-200"
                        :class="isFullscreen ? 'w-24' : 'w-20'"
                      >
                        {{ formatNumber(averageMonthlyPurchases[stamp.denomination]) }}
                      </td>
                      <td class="table-cell" :class="isFullscreen ? 'w-32' : ''"></td>
                    </tr>
                  </tfoot>
                </table>
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

            <button
              @click="$emit('close')"
              class="btn bg-fuchsia-600 hover:bg-fuchsia-700 text-white focus:ring-fuchsia-500 text-sm"
            >
              關閉
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useUtils } from '../composables/useUtils'
import ModalHeader from './ModalHeader.vue'
import AppIcon from './AppIcon.vue'
import CustomDatePicker from './CustomDatePicker.vue'

const props = defineProps({
  show: Boolean,
  stamps: Array,
  statisticsDate: { type: String, default: '' },
  monthlyPostageRecords: Array,
  currentRecord: Object,
  editingRecord: Object,
  averageMonthlyPurchases: Object,
})

const emit = defineEmits([
  'close',
  'save-history-record',
  'confirm-stock-receipt',
  'start-edit-history',
  'delete-history-record',
  'cancel-edit-add-history',
  'handle-month-input-blur',
  'sanitize-history-input',
  'export-history-csv',
  'import-history-csv',
  'update-current-record-month',
  'update-current-record-purchase',
  'update-current-record-notes',
])

const { formatNumber, formatMonthDisplay } = useUtils()

// 全螢幕狀態
const isFullscreen = ref(false)

// 控制新增表單顯示
const showAddForm = ref(false)
const showReceiptForm = ref(false)
const stockReceipt = ref(createEmptyStockReceipt())

// 檔案輸入參考
const fileInput = ref(null)

const receiptTotalCount = computed(() =>
  Object.values(stockReceipt.value.purchases).reduce(
    (total, count) => total + Math.max(0, Math.floor(Number(count) || 0)),
    0
  )
)
const receiptTotalValue = computed(() =>
  (props.stamps || []).reduce(
    (total, stamp) =>
      total +
      stamp.denomination *
        Math.max(0, Math.floor(Number(stockReceipt.value.purchases[stamp.denomination]) || 0)),
    0
  )
)
const canConfirmStockReceipt = computed(
  () =>
    Boolean(stockReceipt.value.receivedDate) &&
    Boolean(stockReceipt.value.postingMonth) &&
    receiptTotalCount.value > 0
)

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
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

// 開始編輯時顯示表單
function startEdit(record) {
  showReceiptForm.value = false
  showAddForm.value = true
  emit('start-edit-history', record)

  // 等待 DOM 更新後滾動到表單並聚焦
  nextTick(() => {
    // 找到Modal的主體區域
    const modalBody = document.querySelector('.modal-body')
    const formElement = document.querySelector('.form-slide-enter-to, .bg-slate-50')

    if (modalBody && formElement) {
      // 計算表單在Modal內的位置
      const modalBodyRect = modalBody.getBoundingClientRect()
      const formRect = formElement.getBoundingClientRect()
      const scrollTop = formRect.top - modalBodyRect.top + modalBody.scrollTop - 20 // 20px 的額外間距

      // 在Modal內部滾動
      modalBody.scrollTo({
        top: scrollTop,
        behavior: 'smooth',
      })
    }
  })
}

// 取消表單
function cancelForm() {
  showAddForm.value = false
  emit('cancel-edit-add-history')
}

function createEmptyStockReceipt() {
  const today = /^\d{4}-\d{2}-\d{2}$/.test(props.statisticsDate)
    ? props.statisticsDate
    : new Date().toISOString().slice(0, 10)
  return {
    receivedDate: today,
    postingMonth: today.slice(0, 7),
    receiptNumber: '',
    notes: '',
    purchases: Object.fromEntries((props.stamps || []).map(stamp => [stamp.denomination, 0])),
  }
}

function startStockReceipt() {
  showAddForm.value = false
  showReceiptForm.value = true
  stockReceipt.value = createEmptyStockReceipt()
}

function cancelStockReceipt() {
  showReceiptForm.value = false
  stockReceipt.value = createEmptyStockReceipt()
}

function confirmStockReceipt() {
  if (!canConfirmStockReceipt.value) return
  emit('confirm-stock-receipt', JSON.parse(JSON.stringify(stockReceipt.value)))
  cancelStockReceipt()
}

// 觸發檔案選擇
function triggerFileInput() {
  fileInput.value?.click()
}

// 處理檔案選擇
function handleFileSelect(event) {
  const file = event.target.files[0]
  if (file) {
    emit('import-history-csv', file)
    // 清空檔案輸入，允許重複選擇同一檔案
    event.target.value = ''
  }
}
</script>

<style scoped>
/* 表單滑入/滑出動畫 */
.form-slide-enter-active,
.form-slide-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.form-slide-enter-from,
.form-slide-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-20px);
}

.form-slide-enter-to,
.form-slide-leave-from {
  opacity: 1;
  max-height: 500px;
  transform: translateY(0);
}
</style>
