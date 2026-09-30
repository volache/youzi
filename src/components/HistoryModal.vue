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
            title="歷史採購紀錄管理"
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

              <button
                v-if="!showAddForm"
                @click="showAddForm = true"
                class="btn bg-fuchsia-600 hover:bg-fuchsia-700 text-white focus:ring-fuchsia-500 text-sm flex items-center"
              >
                <AppIcon name="plus" class="mr-2" size="1.25rem" />
                新增採購紀錄
              </button>
            </div>

            <!-- 新增/編輯紀錄表單 -->
            <Transition name="form-slide">
              <div v-if="showAddForm || editingRecord" class="mb-6 p-4 bg-slate-50 rounded-card">
                <div class="mb-4">
                  <h4 class="text-xl font-semibold text-slate-700 mb-4">
                    {{ editingRecord ? '編輯紀錄' : '新增紀錄' }}
                  </h4>
                </div>

                <!-- 月份輸入區域 -->
                <div class="flex items-start gap-4 mb-4">
                  <!-- 月份輸入 -->
                  <div class="flex-shrink-0">
                    <label for="recordMonth" class="block text-sm font-medium text-slate-700 mb-1"
                      >月份</label
                    >
                    <input
                      type="text"
                      id="recordMonth"
                      ref="monthInput"
                      :value="currentRecord.month"
                      @input="$emit('update-current-record-month', $event.target.value)"
                      @blur="$emit('handle-month-input-blur')"
                      placeholder="例如：202506、11307、114.5"
                      class="input focus:ring-fuchsia-500 focus:border-fuchsia-500 w-48"
                    />
                  </div>

                  <!-- 格式說明 -->
                  <div
                    class="flex-1 bg-slate-100 px-4 py-3 rounded-lg border border-slate-200 min-h-[76px] flex flex-col justify-center"
                  >
                    <div class="font-semibold text-slate-700 text-sm mb-2">月份輸入支援格式：</div>
                    <div class="grid grid-cols-6 gap-x-2 gap-y-1 text-xs text-slate-600">
                      <div>• <code class="bg-white px-1 rounded">202506</code> - 西元年月</div>
                      <div>• <code class="bg-white px-1 rounded">11307</code> - 民國年月</div>
                      <div>• <code class="bg-white px-1 rounded">114.5</code> - 民國年.月</div>
                      <div>• <code class="bg-white px-1 rounded">2024.11</code> - 西元年.月</div>
                      <div>• <code class="bg-white px-1 rounded">2025年6月</code> - 中文格式</div>
                      <div>• <code class="bg-white px-1 rounded">114年6月</code> - 民國中文</div>
                    </div>
                  </div>
                </div>

                <!-- 郵票數量輸入 -->
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
                      class="input text-right focus:ring-fuchsia-500 focus:border-fuchsia-500"
                    />
                  </div>
                </div>
                <div class="mt-4 flex justify-end space-x-3">
                  <button
                    @click="$emit('save-history-record')"
                    class="btn bg-fuchsia-600 hover:bg-fuchsia-700 text-white focus:ring-fuchsia-500 text-sm"
                  >
                    {{ editingRecord ? '保存修改' : '新增紀錄' }}
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

            <div class="table-container">
              <div class="table-title">
                <h4 class="table-title-text">歷史採購紀錄</h4>
              </div>
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
                        尚無歷史紀錄。請新增。
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

defineProps({
  show: Boolean,
  stamps: Array,
  monthlyPostageRecords: Array,
  currentRecord: Object,
  editingRecord: Object,
  averageMonthlyPurchases: Object,
})

const emit = defineEmits([
  'close',
  'save-history-record',
  'start-edit-history',
  'delete-history-record',
  'cancel-edit-add-history',
  'handle-month-input-blur',
  'sanitize-history-input',
  'export-history-csv',
  'import-history-csv',
  'update-current-record-month',
  'update-current-record-purchase',
])

const { formatNumber, formatMonthDisplay } = useUtils()

// 全螢幕狀態
const isFullscreen = ref(false)

// 控制新增表單顯示
const showAddForm = ref(false)

// 檔案輸入參考
const fileInput = ref(null)

// 月份輸入參考
const monthInput = ref(null)

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

    // 聚焦到月份輸入框
    if (monthInput.value) {
      setTimeout(() => {
        monthInput.value.focus()
        monthInput.value.select()
      }, 300) // 等待滾動動畫完成
    }
  })
}

// 取消表單
function cancelForm() {
  showAddForm.value = false
  emit('cancel-edit-add-history')
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
