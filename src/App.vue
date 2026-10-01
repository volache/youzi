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
        @open-mail-records-modal="openMailRecords"
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

      <MailRecordsModal
        v-if="showMailRecordsModal"
        :show="showMailRecordsModal"
        :records="sortedMailRecords"
        :initial-record="editingMailRecord"
        :stamps="stamps"
        @close="showMailRecordsModal = false"
        @save-pending="handleSaveMailPending"
        @confirm-record="handleConfirmMailRecord"
        @confirm-records="handleConfirmMailRecords"
        @delete-pending="handleDeleteMailPending"
        @cancel-record="handleCancelMailRecord"
      />

      <ExportOptionsModal
        v-if="showExportOptionsModal"
        :show="showExportOptionsModal"
        :monthly-postage-records="monthlyPostageRecords"
        :backup-supported="backupSupported"
        :backup-configured="backupConfigured"
        :backup-permission="backupPermission"
        :auto-snapshot-count="autoSnapshotCount"
        @close="showExportOptionsModal = false"
        @export-complete="exportCSV"
        @export-history="exportHistoryCSV"
        @export-inventory="exportInventoryCSV"
        @export-purchase-report="exportPurchaseReportCSV"
        @export-monthly-analysis="exportMonthlyAnalysisCSV"
        @export-backup="exportBackup"
        @import-backup="importBackup"
        @choose-backup-directory="chooseBackupDirectory"
        @backup-now="createManualSnapshot"
        @disconnect-backup-directory="disconnectBackupDirectory"
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
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { usePostageCalculator } from './composables/usePostageCalculator'
import { useUtils } from './composables/useUtils'
import { useLocalStorage } from './composables/useLocalStorage'
import { useExport } from './composables/useExport'
import { useImport } from './composables/useImport'
import { useHistoryManagement } from './composables/useHistoryManagement'
import { useNotifications } from './composables/useNotifications'
import { downloadTextFile } from './utils/fileDownload'
import { useBackupStorage } from './composables/useBackupStorage'

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
import MailRecordsModal from './components/MailRecordsModal.vue'

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
  mailRecords,
  stampInventoryTransactions,
  editingMailRecord,
  sortedMailRecords,
  beginNewRecord,
  savePending,
  confirmRecord,
  confirmRecords,
  cancelRecord,
  deletePending,

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

const showMailRecordsModal = ref(false)
const openMailRecords = () => {
  beginNewRecord()
  showMailRecordsModal.value = true
}

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

const {
  supported: backupSupported,
  isConfigured: backupConfigured,
  permission: backupPermission,
  autoSnapshotCount,
  initialise: initialiseBackupStorage,
  chooseDirectory,
  writeAutoSnapshot,
  disconnectDirectory,
} = useBackupStorage()

const createBackupData = () => ({
  monthlyBudget: monthlyBudget.value,
  stamps: stamps.value,
  idealProportions: idealProportions.value,
  monthlyPostageRecords: monthlyPostageRecords.value,
  currentRuleMode: currentRuleMode.value,
  reportData: reportData.value,
  mailRecords: mailRecords.value,
  stampInventoryTransactions: stampInventoryTransactions.value,
})

const createAutoSnapshot = async ({ requestPermission = false, notify = false } = {}) => {
  try {
    const written = await writeAutoSnapshot(createBackupData(), { requestPermission })
    if (written && notify) showSuccessToast('備份完成', '已儲存至指定資料夾')
    return written
  } catch (error) {
    if (notify) await showAlert(error.message || '無法寫入備份資料夾。', '備份失敗', 'warning')
    return false
  }
}

let automaticBackupTimer
let automaticBackupQueue = Promise.resolve()

const queueAutomaticBackup = () => {
  clearTimeout(automaticBackupTimer)
  automaticBackupTimer = setTimeout(() => {
    automaticBackupQueue = automaticBackupQueue
      .catch(() => undefined)
      .then(() => createAutoSnapshot())
  }, 1200)
}

const flushAutomaticBackup = () => {
  clearTimeout(automaticBackupTimer)
  automaticBackupTimer = undefined
  automaticBackupQueue = automaticBackupQueue
    .catch(() => undefined)
    .then(() => createAutoSnapshot())
  return automaticBackupQueue
}

const chooseBackupDirectory = async () => {
  try {
    await chooseDirectory()
    await createAutoSnapshot({ requestPermission: true })
    showSuccessToast('備份資料夾已設定', '已建立第一份自動備份，系統將保留最近 50 份。')
  } catch (error) {
    if (error?.name !== 'AbortError') {
      await showAlert(error.message || '無法設定備份資料夾。', '設定備份失敗', 'warning')
    }
  }
}

const createManualSnapshot = () => createAutoSnapshot({ requestPermission: true, notify: true })

const disconnectBackupDirectory = async () => {
  const confirmed = await showConfirm(
    '中斷後系統不再自動儲存至此資料夾，既有備份檔不會被刪除。',
    '中斷備份資料夾連結',
    'warning'
  )
  if (!confirmed) return
  await disconnectDirectory()
  showSuccessToast('已中斷備份連結', '既有備份檔仍保留在原資料夾中')
}

const handleSaveMailPending = record => {
  savePending(record)
  beginNewRecord()
  showSuccessToast('已儲存待寄', '郵票庫存尚未扣除')
}

const handleConfirmMailRecord = async record => {
  try {
    confirmRecord(record)
    beginNewRecord()
    showSuccessToast('已確認寄出', '郵票庫存已依選擇的組合扣除')
  } catch (error) {
    await showAlert(error.message || '無法確認寄出，請檢查資料與庫存。', '確認寄出失敗', 'warning')
  }
}

const handleConfirmMailRecords = async ids => {
  try {
    const records = confirmRecords(ids)
    showSuccessToast('已批次確認寄出', `${records.length} 筆待寄紀錄已扣除郵票庫存`)
  } catch (error) {
    await showAlert(error.message || '無法批次確認寄出。', '批次確認失敗', 'warning')
  }
}

const handleDeleteMailPending = async id => {
  const confirmed = await showConfirm('確定要刪除此待寄紀錄嗎？', '刪除待寄紀錄', 'warning')
  if (!confirmed) return
  deletePending(id)
  beginNewRecord()
  showSuccessToast('待寄紀錄已刪除', '郵票庫存未受影響')
}

const handleCancelMailRecord = async ({ id, reason, returnStock }) => {
  try {
    cancelRecord(id, { reason, returnStock })
    showSuccessToast(
      '寄件紀錄已取消',
      returnStock ? '郵票已依原面額組合退回庫存' : '郵票未退回庫存'
    )
  } catch (error) {
    await showAlert(error.message || '無法取消寄件紀錄。', '取消寄件失敗', 'warning')
  }
}

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
    const savedBeforeRestore = await createAutoSnapshot({ requestPermission: true })
    if (!savedBeforeRestore && backupConfigured.value) {
      await showAlert('無法先將目前資料寫入備份資料夾，已取消還原。', '還原前備份失敗', 'warning')
      return
    }
    if (!savedBeforeRestore) {
      exportBackup()
      await showAlert(
        '尚未設定自動備份資料夾，已先下載目前資料的備份檔後再還原。',
        '已下載還原前備份',
        'warning'
      )
    }
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

const handlePageHidden = () => {
  if (document.visibilityState === 'hidden') flushAutomaticBackup()
}

watch(
  [
    monthlyBudget,
    stamps,
    idealProportions,
    monthlyPostageRecords,
    currentRuleMode,
    reportData,
    mailRecords,
    stampInventoryTransactions,
  ],
  queueAutomaticBackup,
  { deep: true }
)

onMounted(() => {
  initialiseBackupStorage()
  document.addEventListener('visibilitychange', handlePageHidden)
  window.addEventListener('pagehide', flushAutomaticBackup)
})

onBeforeUnmount(() => {
  clearTimeout(automaticBackupTimer)
  document.removeEventListener('visibilitychange', handlePageHidden)
  window.removeEventListener('pagehide', flushAutomaticBackup)
})

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
