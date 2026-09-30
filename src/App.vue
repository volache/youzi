<template>
  <div class="min-h-screen p-4 md:p-8">
    <div class="max-w-6xl mx-auto" :inert="isAnyModalOpen">
      <!-- 標題區域 -->
      <AppHeader />

      <!-- 主要內容區域 -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- 左側統計面板 -->
        <StatisticsPanel
          :monthly-budget="monthlyBudget"
          :total-stamp-count="totalStampCount"
          :total-remaining-count="totalRemainingCount"
          :total-planned-purchase-count="totalPlannedPurchaseCount"
          :total-remaining-value="totalRemainingValue"
          :recommended-top-up-amount="recommendedTopUpAmount"
          :purchasable-amount="purchasableAmount"
          :purchasable-amount-label="purchasableAmountLabel"
          :total-planned-purchase-value="totalPlannedPurchaseValue"
          :stamps="stamps"
        />

        <!-- 右側計算器面板 -->
        <CalculatorPanel
          :stamps="stamps"
          :total-remaining-count="totalRemainingCount"
          :total-remaining-value="totalRemainingValue"
          :total-planned-purchase-count="totalPlannedPurchaseCount"
          :total-planned-purchase-value="totalPlannedPurchaseValue"
          :total-stamp-count="totalStampCount"
          :total-stamp-value="totalStampValue"
          :purchasable-amount="purchasableAmount"
          :all-stamps-meet-min-stock="allStampsMeetMinStock()"
          :has-report-data="!!reportData"
          :statistics-date="statisticsDate"
          @suggest-optimal-purchases="suggestOptimalPurchases"
          @sanitize-int-input="sanitizeIntegerInput"
          @show-latest-report="showReportModal = true"
          @reset-purchases="resetPurchases"
          @update:statistics-date="statisticsDate = $event"
        />
      </div>

      <!-- 浮動操作按鈕 -->
      <FloatingActionButtons
        :has-report-data="!!reportData"
        @open-history-modal="showHistoryModal = true"
        @open-advanced-settings-modal="showAdvancedSettingsModal = true"
        @open-postage-combinator-modal="showPostageCombinatorModal = true"
        @show-export-options="showExportOptionsModal = true"
      />

      <!-- 頁腳 -->
      <AppFooter />
    </div>

    <!-- Modal 元件 -->
    <div :inert="confirmModal.show">
      <AdvancedSettingsModal
        v-if="showAdvancedSettingsModal"
        :show="showAdvancedSettingsModal"
        :stamps="stamps"
        :ideal-proportions="idealProportions"
        :current-rule-mode-display="currentRuleModeDisplay"
        :total-proportion-sum="totalProportionSum"
        :monthly-budget="monthlyBudget"
        @close="showAdvancedSettingsModal = false"
        @reset-advanced-settings="resetAdvancedSettings"
        @update-rule-mode="currentRuleMode = 'custom'"
        @sanitize-int-input="sanitizeIntegerInput"
        @sanitize-proportion-input="sanitizeProportionInput"
        @update:monthly-budget="monthlyBudget = $event"
      />

      <ReportModal
        v-if="showReportModal"
        :show="showReportModal"
        :report-data="reportData"
        @close="showReportModal = false"
        @copy-report="copyReportToClipboard"
      />

      <HistoryModal
        v-if="showHistoryModal"
        :show="showHistoryModal"
        :stamps="stamps"
        :monthly-postage-records="monthlyPostageRecords"
        :current-record="currentRecord"
        :editing-record="editingRecord"
        :average-monthly-purchases="averageMonthlyPurchases"
        @close="showHistoryModal = false"
        @save-history-record="saveHistoryRecord"
        @start-edit-history="startEditHistory"
        @delete-history-record="deleteHistoryRecord"
        @cancel-edit-add-history="cancelEditAddHistory"
        @handle-month-input-blur="handleMonthInputBlur"
        @update-current-record-month="updateCurrentRecordMonth"
        @update-current-record-purchase="updateCurrentRecordPurchase"
        @sanitize-history-input="sanitizeHistoryInput"
        @export-history-csv="exportHistoryCSV"
        @import-history-csv="importHistoryCSV"
      />

      <PostageCombinatorModal
        v-if="showPostageCombinatorModal"
        :show="showPostageCombinatorModal"
        :stamps="stamps"
        @close="showPostageCombinatorModal = false"
      />

      <ExportOptionsModal
        v-if="showExportOptionsModal"
        :show="showExportOptionsModal"
        :monthly-postage-records="monthlyPostageRecords"
        @close="showExportOptionsModal = false"
        @export-complete="exportCSV"
        @export-history="exportHistoryCSV"
        @export-inventory="exportInventoryCSV"
        @export-purchase-report="exportPurchaseReportCSV"
        @export-monthly-analysis="exportMonthlyAnalysisCSV"
        @export-backup="exportBackup"
        @import-backup="importBackup"
      />
    </div>

    <ConfirmModal
      v-if="confirmModal.show"
      :show="confirmModal.show"
      :type="confirmModal.type"
      :title="confirmModal.title"
      :message="confirmModal.message"
      :confirm-text="confirmModal.confirmText"
      :cancel-text="confirmModal.cancelText"
      :show-cancel="confirmModal.showCancel"
      @confirm="handleConfirm"
      @cancel="handleCancel"
      @close="confirmModal.show = false"
    />

    <!-- Toast 通知系統 -->
    <ToastNotification />
  </div>
</template>

<script setup>
import { usePostageCalculator } from './composables/usePostageCalculator'
import { useUtils } from './composables/useUtils'
import { useLocalStorage } from './composables/useLocalStorage'
import { useExport } from './composables/useExport'
import { useImport } from './composables/useImport'
import { useHistoryManagement } from './composables/useHistoryManagement'
import { useNotifications } from './composables/useNotifications'
import { downloadTextFile } from './utils/fileDownload'

// 元件導入
import AppHeader from './components/AppHeader.vue'
import AppFooter from './components/AppFooter.vue'
import StatisticsPanel from './components/StatisticsPanel.vue'
import CalculatorPanel from './components/CalculatorPanel.vue'
import FloatingActionButtons from './components/FloatingActionButtons.vue'
import AdvancedSettingsModal from './components/AdvancedSettingsModal.vue'
import ReportModal from './components/ReportModal.vue'
import HistoryModal from './components/HistoryModal.vue'
import PostageCombinatorModal from './components/PostageCombinatorModal.vue'
import ExportOptionsModal from './components/ExportOptionsModal.vue'
import ConfirmModal from './components/ConfirmModal.vue'
import ToastNotification from './components/ToastNotification.vue'

// 使用 composables
const {
  // 響應式數據
  statisticsDate,
  monthlyBudget,
  stamps,
  idealProportions,
  showAdvancedSettingsModal,
  showReportModal,
  showHistoryModal,
  showPostageCombinatorModal,
  showExportOptionsModal,
  reportData,
  monthlyPostageRecords,
  currentRecord,
  editingRecord,
  currentRuleMode,

  // 計算屬性
  totalRemainingCount,
  totalRemainingValue,
  totalPlannedPurchaseCount,
  totalPlannedPurchaseValue,
  totalStampCount,
  totalStampValue,
  recommendedTopUpAmount,
  purchasableAmount,
  purchasableAmountLabel,
  totalProportionSum,
  currentRuleModeDisplay,
  averageMonthlyPurchases,

  // 方法
  allStampsMeetMinStock,
  resetAdvancedSettings,
  resetPurchases,
  suggestOptimalPurchases,
  restoreFromBackup,
} = usePostageCalculator()

const { sanitizeIntegerInput, sanitizeProportionInput, sanitizeHistoryInput } = useUtils()

const { formatAndValidateMonthInput, sanitizeDataForStorage } = useLocalStorage()
const {
  alert: showAlert,
  confirm: showConfirm,
  confirmModal,
  handleConfirm,
  handleCancel,
  showSuccessToast,
} = useNotifications()

const createBackupData = () => ({
  monthlyBudget: monthlyBudget.value,
  stamps: stamps.value,
  idealProportions: idealProportions.value,
  monthlyPostageRecords: monthlyPostageRecords.value,
  currentRuleMode: currentRuleMode.value,
  reportData: reportData.value,
})

const exportBackup = () => {
  downloadTextFile(
    JSON.stringify(createBackupData(), null, 2),
    `郵資大師備份_${new Date().toISOString().slice(0, 10)}.json`,
    'application/json;charset=utf-8'
  )
}

const importBackup = async file => {
  try {
    const rawData = JSON.parse(await file.text())
    if (
      !rawData ||
      typeof rawData !== 'object' ||
      !Array.isArray(rawData.stamps) ||
      !Array.isArray(rawData.idealProportions) ||
      !Array.isArray(rawData.monthlyPostageRecords)
    ) {
      throw new Error('備份缺少必要資料')
    }
    const backupData = sanitizeDataForStorage(rawData)
    const confirmed = await showConfirm(
      `確定要還原「${file.name}」嗎？目前資料會先自動備份。`,
      '確認還原備份',
      'warning'
    )
    if (!confirmed) return
    restoreFromBackup(backupData)
    showSuccessToast('還原完成', '備份資料已套用並儲存')
  } catch {
    await showAlert(
      '無法讀取此備份檔，請確認檔案是由郵資大師匯出的 JSON 備份。',
      '備份格式錯誤',
      'error'
    )
  }
}

const {
  exportCSV,
  exportHistoryCSV,
  exportInventoryCSV,
  exportPurchaseReportCSV,
  exportMonthlyAnalysisCSV,
  copyReportToClipboard,
} = useExport({
  statisticsDate,
  monthlyBudget,
  stamps,
  idealProportions,
  totalProportionSum,
  monthlyPostageRecords,
  reportData,
  totalRemainingCount,
  totalRemainingValue,
  totalPlannedPurchaseCount,
  totalPlannedPurchaseValue,
  totalStampCount,
  totalStampValue,
  currentRuleMode,
  currentRuleModeDisplay,
  allStampsMeetMinStock,
})

const { importHistoryCSV } = useImport({
  monthlyPostageRecords,
  stamps,
})

const {
  saveHistoryRecord,
  startEditHistory,
  deleteHistoryRecord,
  cancelEditAddHistory,
  handleMonthInputBlur,
  updateCurrentRecordMonth,
  updateCurrentRecordPurchase,
} = useHistoryManagement({
  monthlyPostageRecords,
  currentRecord,
  editingRecord,
  stamps,
  formatAndValidateMonthInput,
})
</script>
