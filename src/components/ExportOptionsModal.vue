<template>
  <Transition name="modal-fade">
    <div v-if="show" class="modal-overlay">
      <Transition name="modal-content-fade">
        <div
          v-if="show"
          class="modal-content max-w-2xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-options-title"
        >
          <ModalHeader
            title="選擇匯出類型"
            title-id="export-options-title"
            title-class="text-secondary-600"
            @close="$emit('close')"
          />

          <div class="modal-body">
            <p class="text-slate-600 mb-6">請選擇您要匯出的 CSV 檔案類型：</p>

            <section class="mb-6 rounded-xl border border-secondary-200 bg-secondary-50 p-4">
              <h4 class="font-semibold text-secondary-900">完整資料備份</h4>
              <p class="mt-1 text-sm text-secondary-700">
                備份包含庫存、規則、歷史紀錄與採購報告，可在本系統還原。
              </p>
              <div class="mt-3 flex flex-wrap gap-3">
                <button @click="$emit('export-backup')" class="btn-secondary text-sm">
                  匯出備份檔
                </button>
                <label
                  class="btn bg-white text-secondary-700 border border-secondary-300 hover:bg-secondary-100 text-sm cursor-pointer"
                >
                  匯入備份檔
                  <input
                    class="sr-only"
                    type="file"
                    accept="application/json,.json"
                    @change="handleBackupFile"
                  />
                </label>
              </div>
            </section>

            <div class="space-y-4">
              <!-- 完整系統報告 -->
              <div
                class="p-6 border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-md transition-all duration-200 bg-white group cursor-pointer"
                role="button"
                tabindex="0"
                @click="handleExportComplete"
                @keydown.enter.space.prevent="handleExportComplete"
              >
                <div class="flex items-start space-x-4">
                  <div class="flex-shrink-0 mt-1">
                    <div
                      class="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white group-hover:from-blue-600 group-hover:to-blue-700 transition-all duration-200"
                    >
                      <AppIcon name="file-document-outline" size="1.5rem" />
                    </div>
                  </div>
                  <div class="flex-1">
                    <h4
                      class="text-lg font-semibold text-slate-800 group-hover:text-blue-600 transition-colors"
                    >
                      完整系統報告
                    </h4>
                    <p class="text-slate-600 text-sm mt-1">
                      包含所有系統設定、採購規則、歷史紀錄、統計資訊和庫存明細的完整報告
                    </p>
                    <div class="flex flex-wrap gap-2 mt-3">
                      <span
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >基本設定</span
                      >
                      <span
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                        >採購規則</span
                      >
                      <span
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                        >歷史紀錄</span
                      >
                      <span
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800"
                        >統計資訊</span
                      >
                      <span
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800"
                        >庫存明細</span
                      >
                    </div>
                  </div>
                  <div class="flex-shrink-0">
                    <AppIcon
                      name="chevron-right"
                      class="text-slate-400 transition-colors group-hover:text-blue-500"
                      size="1.25rem"
                    />
                  </div>
                </div>
              </div>

              <!-- 採購建議報告 -->
              <div
                class="p-6 border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-md transition-all duration-200 bg-white group cursor-pointer"
                role="button"
                tabindex="0"
                @click="handleExportPurchaseReport"
                @keydown.enter.space.prevent="handleExportPurchaseReport"
              >
                <div class="flex items-start space-x-4">
                  <div class="flex-shrink-0 mt-1">
                    <div
                      class="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center text-white group-hover:from-indigo-600 group-hover:to-indigo-700 transition-all duration-200"
                    >
                      <AppIcon name="chart-bar" size="1.5rem" />
                    </div>
                  </div>
                  <div class="flex-1">
                    <h4
                      class="text-lg font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors"
                    >
                      採購建議報告
                    </h4>
                    <p class="text-slate-600 text-sm mt-1">
                      詳細的採購建議分析，包含三階段策略、效率評估和比例達成度
                    </p>
                    <div class="flex flex-wrap gap-2 mt-3">
                      <span
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                        >建議數量</span
                      >
                      <span
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                        >三階段策略</span
                      >
                      <span
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                        >效率評估</span
                      >
                      <span
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >達成比例</span
                      >
                    </div>
                  </div>
                  <div class="flex-shrink-0">
                    <AppIcon
                      name="chevron-right"
                      class="text-slate-400 transition-colors group-hover:text-indigo-500"
                      size="1.25rem"
                    />
                  </div>
                </div>
              </div>

              <!-- 歷史採購紀錄 -->
              <div
                class="p-6 border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-md transition-all duration-200 bg-white group cursor-pointer"
                role="button"
                tabindex="0"
                @click="handleExportHistory"
                @keydown.enter.space.prevent="handleExportHistory"
              >
                <div class="flex items-start space-x-4">
                  <div class="flex-shrink-0 mt-1">
                    <div
                      class="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center text-white group-hover:from-emerald-600 group-hover:to-emerald-700 transition-all duration-200"
                    >
                      <AppIcon name="history" size="1.5rem" />
                    </div>
                  </div>
                  <div class="flex-1">
                    <h4
                      class="text-lg font-semibold text-slate-800 group-hover:text-emerald-600 transition-colors"
                    >
                      歷史採購紀錄
                    </h4>
                    <p class="text-slate-600 text-sm mt-1">
                      僅包含歷史採購紀錄的純資料格式，適合重新匯入或進行資料分析
                    </p>
                    <div class="flex flex-wrap gap-2 mt-3">
                      <span
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"
                        >採購數量</span
                      >
                      <span
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >歷史數據</span
                      >
                      <span
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                        >可重新匯入</span
                      >
                    </div>
                  </div>
                  <div class="flex-shrink-0">
                    <AppIcon
                      name="chevron-right"
                      class="text-slate-400 transition-colors group-hover:text-emerald-500"
                      size="1.25rem"
                    />
                  </div>
                </div>
              </div>

              <!-- 月度統計分析 -->
              <div
                class="p-6 border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-md transition-all duration-200 bg-white group cursor-pointer"
                role="button"
                tabindex="0"
                @click="handleExportMonthlyAnalysis"
                @keydown.enter.space.prevent="handleExportMonthlyAnalysis"
              >
                <div class="flex items-start space-x-4">
                  <div class="flex-shrink-0 mt-1">
                    <div
                      class="w-12 h-12 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl flex items-center justify-center text-white group-hover:from-rose-600 group-hover:to-rose-700 transition-all duration-200"
                    >
                      <AppIcon name="chart-box-outline" size="1.5rem" />
                    </div>
                  </div>
                  <div class="flex-1">
                    <h4
                      class="text-lg font-semibold text-slate-800 group-hover:text-rose-600 transition-colors"
                    >
                      月度統計分析
                    </h4>
                    <p class="text-slate-600 text-sm mt-1">
                      基於歷史數據的深度分析，包含趨勢、頻率和成本效益評估
                    </p>
                    <div class="flex flex-wrap gap-2 mt-3">
                      <span
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800"
                        >月均數量</span
                      >
                      <span
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800"
                        >趨勢分析</span
                      >
                      <span
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                        >頻率排名</span
                      >
                      <span
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >成本效益</span
                      >
                    </div>
                  </div>
                  <div class="flex-shrink-0">
                    <AppIcon
                      name="chevron-right"
                      class="text-slate-400 transition-colors group-hover:text-rose-500"
                      size="1.25rem"
                    />
                  </div>
                </div>
              </div>

              <!-- 當前庫存明細 -->
              <div
                class="p-6 border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-md transition-all duration-200 bg-white group cursor-pointer"
                role="button"
                tabindex="0"
                @click="handleExportInventory"
                @keydown.enter.space.prevent="handleExportInventory"
              >
                <div class="flex items-start space-x-4">
                  <div class="flex-shrink-0 mt-1">
                    <div
                      class="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center text-white group-hover:from-amber-600 group-hover:to-amber-700 transition-all duration-200"
                    >
                      <AppIcon name="package-variant-closed" size="1.5rem" />
                    </div>
                  </div>
                  <div class="flex-1">
                    <h4
                      class="text-lg font-semibold text-slate-800 group-hover:text-amber-600 transition-colors"
                    >
                      當前庫存明細
                    </h4>
                    <p class="text-slate-600 text-sm mt-1">
                      包含當前郵票庫存、規劃採購數量和金額統計的詳細明細
                    </p>
                    <div class="flex flex-wrap gap-2 mt-3">
                      <span
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"
                        >剩餘庫存</span
                      >
                      <span
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >採購規劃</span
                      >
                      <span
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                        >金額統計</span
                      >
                    </div>
                  </div>
                  <div class="flex-shrink-0">
                    <AppIcon
                      name="chevron-right"
                      class="text-slate-400 transition-colors group-hover:text-amber-500"
                      size="1.25rem"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer flex justify-end">
            <button
              @click="$emit('close')"
              class="btn bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500 text-sm"
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
import ModalHeader from './ModalHeader.vue'
import AppIcon from './AppIcon.vue'

defineProps({
  show: Boolean,
  monthlyPostageRecords: Array,
})

const emit = defineEmits([
  'close',
  'export-complete',
  'export-history',
  'export-inventory',
  'export-purchase-report',
  'export-monthly-analysis',
  'export-backup',
  'import-backup',
])

function handleBackupFile(event) {
  const [file] = event.target.files || []
  if (file) emit('import-backup', file)
  event.target.value = ''
}

function handleExportComplete() {
  emit('export-complete')
  emit('close')
}

function handleExportHistory() {
  emit('export-history')
  emit('close')
}

function handleExportInventory() {
  emit('export-inventory')
  emit('close')
}

function handleExportPurchaseReport() {
  emit('export-purchase-report')
  emit('close')
}

function handleExportMonthlyAnalysis() {
  emit('export-monthly-analysis')
  emit('close')
}
</script>
