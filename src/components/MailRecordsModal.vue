<template>
  <Transition name="modal-fade">
    <div v-if="show" class="modal-overlay">
      <div
        :class="[modalContentClass, 'relative']"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mail-records-title"
      >
        <ModalHeader
          title="郵寄紀錄"
          title-id="mail-records-title"
          title-class="text-primary-700"
          fullscreen-enabled
          :is-fullscreen="isFullscreen"
          @toggle-fullscreen="toggleFullscreen"
          @close="$emit('close')"
        />
        <div :class="modalBodyClass">
          <div
            class="absolute left-1/2 top-5 z-10 flex -translate-x-1/2 items-center gap-3 text-sm"
            role="tablist"
            aria-label="郵寄紀錄功能"
          >
            <button
              class="border-b-2 px-1 py-1 font-semibold transition-colors"
              :class="
                activeTab === 'entry'
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              "
              @click="activeTab = 'entry'"
              title="新增郵寄資料"
              aria-label="新增郵寄資料"
            >
              新增郵寄資料
            </button>
            <button
              class="border-b-2 px-1 py-1 font-semibold transition-colors"
              :class="
                activeTab === 'list'
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              "
              @click="activeTab = 'list'"
              title="寄件清單"
              aria-label="寄件清單"
            >
              寄件清單
              <span
                class="inline-flex min-w-5 items-center justify-center rounded-full bg-primary-100 px-1.5 py-0.5 text-xs font-semibold text-primary-700"
                :aria-label="`待寄出 ${pendingRecordCount} 件，今日寄件 ${todayRecordCount} 件`"
                :title="`待寄出 ${pendingRecordCount} 件／今日寄件總計 ${todayRecordCount} 件`"
                >{{ pendingRecordCount }}/{{ todayRecordCount }}</span
              >
            </button>
          </div>
          <section v-show="activeTab === 'entry'" class="space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h3 class="text-lg font-semibold text-slate-800">
                {{ record.id ? '編輯待寄紀錄' : '新增郵寄資料' }}
              </h3>
              <div class="flex items-center gap-2">
                <template v-if="currentPendingIndex !== -1">
                  <button
                    class="btn bg-slate-100 text-sm text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="!canNavigatePrevious"
                    :aria-label="`上一筆待寄紀錄（目前第 ${currentPendingIndex + 1} 筆）`"
                    title="上一筆待寄紀錄"
                    @click="navigatePendingRecord(-1)"
                  >
                    ← 上一筆
                  </button>
                  <span class="min-w-12 text-center text-xs text-slate-500" aria-live="polite"
                    >{{ currentPendingIndex + 1 }} / {{ pendingRecords.length }}</span
                  >
                  <button
                    class="btn bg-slate-100 text-sm text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="!canNavigateNext"
                    :aria-label="`下一筆待寄紀錄（目前第 ${currentPendingIndex + 1} 筆）`"
                    title="下一筆待寄紀錄"
                    @click="navigatePendingRecord(1)"
                  >
                    下一筆 →
                  </button>
                </template>
                <button
                  class="btn bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm"
                  @click="reset"
                >
                  清空欄位
                </button>
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
              <label class="text-sm font-medium text-slate-700 md:order-1"
                >寄件日期<CustomDatePicker v-model="record.sentDate"
              /></label>
              <label class="text-sm font-medium text-slate-700 md:order-4"
                >郵寄方式<CustomSelect
                  v-model="record.mailType"
                  :options="methods.map(method => ({ value: method.key, label: method.name }))"
              /></label>
              <label class="text-sm font-medium text-slate-700 md:order-2"
                >寄件者（單位）<ComboboxInput
                  v-model="record.sender"
                  :options="senderOptions"
                  placeholder="輸入或選擇曾使用的寄件者"
              /></label>
              <label class="text-sm font-medium text-slate-700 md:order-3"
                >文號／案件編號<input v-model="record.referenceNumber" class="input mt-1 w-full"
              /></label>
              <label class="text-sm font-medium text-slate-700 md:order-5"
                >收件者<ComboboxInput
                  v-model="record.recipient"
                  :options="recipientOptions"
                  placeholder="輸入或選擇曾使用的收件者"
                  @select="fillRecipientAddress"
              /></label>
              <label v-if="trackingRequired" class="text-sm font-medium text-slate-700 md:order-7"
                >掛號追蹤號碼<input
                  v-model="record.trackingNumber"
                  class="input mt-1 w-full"
                  placeholder="請輸入追蹤號碼"
              /></label>
              <p
                v-if="trackingRequired"
                class="mt-5 self-center text-xs text-slate-500 md:order-8 md:col-span-3"
              >
                可先儲存待寄並稍後補填；確認寄出前，掛號類型須填妥此欄位。
              </p>
              <label class="text-sm font-medium text-slate-700 md:order-6 md:col-span-3"
                >收件地址（選填）<input v-model="record.recipientAddress" class="input mt-1 w-full"
              /></label>
            </div>
            <div class="rounded-card border border-primary-100 bg-primary-50 p-4">
              <h4 class="font-semibold text-primary-800 mb-3">郵資與郵票組合</h4>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <label class="text-sm font-medium text-slate-700"
                  >重量（公克）<input
                    v-model.number="record.weight"
                    type="number"
                    min="0"
                    step="0.1"
                    class="input mt-1 h-9 w-full text-sm"
                    @keyup.enter="calculate"
                /></label>
                <label class="text-sm font-medium text-slate-700"
                  >郵資（元）<input
                    v-model.number="record.postage"
                    type="number"
                    min="1"
                    class="input mt-1 h-9 w-full text-sm"
                /></label>
                <button
                  class="btn h-9 bg-primary-600 hover:bg-primary-700 text-sm text-white disabled:opacity-50"
                  :disabled="calculatingCombinations"
                  @click="calculate"
                >
                  {{
                    calculatingCombinations
                      ? '計算中…'
                      : canAutoCalculate
                        ? '計算郵資並推薦面額組合'
                        : '依郵資推薦組合'
                  }}
                </button>
              </div>
              <p class="mt-2 text-xs text-slate-500">
                一般信函與掛號會沿用現有郵資計算器；雙掛號、包裹與快捷請依憑單輸入郵資，再由系統推薦庫存內可用組合。
              </p>
              <p v-if="calculatorError" class="mt-2 text-sm text-danger-700">
                {{ calculatorError }}
              </p>
              <div v-if="calculatorRecommendations.length" class="mt-4">
                <p class="text-sm font-medium text-slate-700 mb-2">從庫存可用組合中選擇：</p>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="combo in calculatorRecommendations"
                    :key="combo.key"
                    class="rounded-button border px-3 py-2 text-sm transition"
                    :class="
                      isSelected(combo)
                        ? 'border-primary-600 bg-primary-100 text-primary-800'
                        : 'border-slate-300 bg-white hover:border-primary-300'
                    "
                    @click="record.stampCombination = combo.items"
                  >
                    <span class="mb-1 flex flex-wrap gap-1">
                      <span
                        v-for="item in combo.items"
                        :key="item.denomination"
                        class="inline-flex items-center rounded-button border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700"
                        >{{ item.denomination }} 元 × {{ item.count }}</span
                      >
                    </span>
                    <span class="block text-left text-xs text-slate-600"
                      >共 {{ combo.count }} 張</span
                    >
                  </button>
                </div>
              </div>
              <p v-if="recommendationMessage" class="mt-3 text-sm text-amber-800">
                {{ recommendationMessage }}
              </p>
              <div class="mt-4 border-t border-primary-200 pt-4">
                <p class="text-sm font-medium text-slate-700">手動調整面額與張數</p>
                <div class="mt-2 overflow-x-auto pb-1">
                  <div class="grid min-w-[660px] grid-cols-11 gap-1">
                    <label
                      v-for="stamp in stamps"
                      :key="stamp.denomination"
                      class="text-xs text-slate-600"
                      >{{ stamp.denomination }} 元（庫存 {{ stamp.remainingCount }})<input
                        :value="manualCount(stamp.denomination)"
                        type="number"
                        min="0"
                        :max="stamp.remainingCount"
                        class="input mt-1 h-9 w-full text-sm"
                        @input="setManualCount(stamp.denomination, $event.target.value)"
                    /></label>
                  </div>
                </div>
              </div>
              <p v-if="record.stampCombination.length" class="mt-3 text-sm text-primary-800">
                已選組合：{{ combinationText(record.stampCombination) }}
              </p>
            </div>
            <label class="block text-sm font-medium text-slate-700"
              >備註<textarea v-model="record.notes" rows="2" class="input mt-1 w-full"></textarea>
            </label>
            <div class="flex flex-wrap justify-end gap-2">
              <button
                class="btn h-9 bg-slate-600 hover:bg-slate-700 text-sm text-white"
                @click="savePending"
              >
                儲存待寄</button
              ><button
                class="btn h-9 bg-success-600 hover:bg-success-700 text-sm text-white"
                @click="confirmSent"
              >
                確認寄出並扣庫存
              </button>
            </div>
          </section>
          <section v-show="activeTab === 'list'">
            <div class="flex items-center justify-between gap-2 mb-3">
              <h3 class="text-lg font-semibold text-slate-800">寄件清單</h3>
              <button
                class="btn bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500 text-sm flex items-center"
                @click="exportRecords"
              >
                <AppIcon name="file-download-outline" class="mr-2" size="1.25rem" />
                匯出指定期間 CSV
              </button>
            </div>
            <div class="grid grid-cols-2 gap-2 mb-3 md:grid-cols-5">
              <label class="text-xs text-slate-600"
                >起日<CustomDatePicker v-model="exportStart"
              /></label>
              <label class="text-xs text-slate-600"
                >迄日<CustomDatePicker v-model="exportEnd"
              /></label>
              <label class="text-xs text-slate-600"
                >關鍵字<input
                  v-model="filterText"
                  class="input mt-1 h-9 text-sm"
                  placeholder="收件者、寄件者、文號"
              /></label>
              <label class="text-xs text-slate-600"
                >郵寄方式<CustomSelect v-model="filterMethod" :options="filterMethodOptions"
              /></label>
              <label class="text-xs text-slate-600"
                >狀態<CustomSelect v-model="filterStatus" :options="filterStatusOptions"
              /></label>
            </div>
            <div
              v-if="selectedPendingRecords.length"
              class="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2"
            >
              <p class="text-sm font-medium text-primary-800">
                已選 {{ selectedPendingRecords.length }} 筆待寄出｜總郵資
                {{ selectedPendingPostage }} 元
              </p>
              <button
                class="btn bg-success-600 text-sm text-white hover:bg-success-700"
                @click="batchConfirmOpen = true"
              >
                批次確認寄出
              </button>
            </div>
            <div class="table-container">
              <div class="overflow-x-auto custom-scrollbar">
                <table class="table">
                  <thead>
                    <tr>
                      <th class="table-header w-10 text-center">
                        <input
                          type="checkbox"
                          :checked="allVisiblePendingSelected"
                          :aria-label="
                            allVisiblePendingSelected ? '取消全選待寄紀錄' : '全選待寄紀錄'
                          "
                          @change="toggleAllVisiblePending($event.target.checked)"
                        />
                      </th>
                      <th class="table-header">寄件日期</th>
                      <th class="table-header">收件者</th>
                      <th class="table-header">寄件者／文號</th>
                      <th class="table-header">郵寄方式</th>
                      <th class="table-header">掛號號碼</th>
                      <th class="table-header text-right">郵資</th>
                      <th class="table-header">面額組合</th>
                      <th class="table-header text-center">狀態</th>
                      <th class="table-header text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-slate-200">
                    <tr
                      v-for="item in filteredRecords"
                      :key="item.id"
                      class="table-row hover:bg-slate-50 transition-colors"
                    >
                      <td class="table-cell text-center">
                        <input
                          v-if="item.status === 'pending'"
                          type="checkbox"
                          :checked="selectedPendingIds.includes(item.id)"
                          :aria-label="`選擇 ${item.recipient || '待寄紀錄'}`"
                          @change="togglePendingSelection(item.id, $event.target.checked)"
                        />
                      </td>
                      <td class="table-cell whitespace-nowrap">{{ item.sentDate }}</td>
                      <td
                        class="table-cell font-medium"
                        :title="item.recipientAddress || '未填寫收件地址'"
                      >
                        {{ item.recipient }}
                      </td>
                      <td class="table-cell">
                        {{ item.sender
                        }}<span v-if="item.referenceNumber">／{{ item.referenceNumber }}</span>
                      </td>
                      <td class="table-cell">{{ nameOf(item.mailType) }}</td>
                      <td class="table-cell font-mono">{{ item.trackingNumber || '—' }}</td>
                      <td class="table-cell text-right whitespace-nowrap">{{ item.postage }} 元</td>
                      <td class="table-cell">
                        <template v-if="item.stampCombination?.length">
                          <div class="flex flex-wrap gap-1">
                            <span
                              v-for="stamp in item.stampCombination"
                              :key="stamp.denomination"
                              class="inline-flex items-center rounded-button border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700"
                              >{{ stamp.denomination }} 元 × {{ stamp.count }}</span
                            >
                          </div>
                        </template>
                        <span v-else class="text-slate-400">未選擇</span>
                      </td>
                      <td class="table-cell text-center whitespace-nowrap">
                        <span
                          :class="statusClass(item)"
                          :title="item.status === 'cancelled' ? item.cancellationReason : ''"
                          >{{ statusLabel(item) }}</span
                        >
                      </td>
                      <td class="table-cell text-center whitespace-nowrap">
                        <button
                          v-if="item.status === 'pending'"
                          class="ml-2 text-primary-700 hover:underline"
                          @click="edit(item)"
                        >
                          編輯</button
                        ><button
                          v-if="item.status === 'pending'"
                          class="ml-2 text-danger-600 hover:underline"
                          @click="$emit('delete-pending', item.id)"
                        >
                          刪除
                        </button>
                        <button
                          v-if="item.status === 'sent'"
                          class="ml-2 text-danger-600 hover:underline"
                          @click="openCancellation(item)"
                        >
                          取消／作廢
                        </button>
                      </td>
                    </tr>
                    <tr v-if="!filteredRecords.length">
                      <td colspan="10" class="table-cell text-center text-slate-500 py-8">
                        尚無郵寄紀錄，請新增
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
        <div
          v-if="cancellingRecord"
          class="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/35 p-4"
        >
          <form
            class="w-full max-w-md rounded-card bg-white p-6 shadow-xl"
            @submit.prevent="confirmCancellation"
          >
            <h3 class="text-lg font-semibold text-slate-800">取消／作廢寄件紀錄</h3>
            <p class="mt-1 text-sm text-slate-600">
              {{ cancellingRecord.recipient }}｜{{ cancellingRecord.postage }} 元
            </p>
            <label class="mt-4 block text-sm font-medium text-slate-700"
              >取消原因<textarea
                v-model.trim="cancellationReason"
                required
                rows="3"
                class="input mt-1 w-full"
                placeholder="請說明取消原因"
              />
            </label>
            <fieldset class="mt-4">
              <legend class="text-sm font-medium text-slate-700">郵票處理</legend>
              <label
                class="mt-2 flex cursor-pointer gap-2 rounded-lg border border-primary-200 bg-primary-50 p-3 text-sm text-slate-700"
              >
                <input v-model="returnStock" type="radio" :value="true" class="mt-0.5" />
                <span
                  ><strong class="font-semibold">未使用，退回庫存</strong
                  ><br />依原面額組合加回庫存</span
                >
              </label>
              <label
                class="mt-2 flex cursor-pointer gap-2 rounded-lg border border-slate-200 p-3 text-sm text-slate-700"
              >
                <input v-model="returnStock" type="radio" :value="false" class="mt-0.5" />
                <span
                  ><strong class="font-semibold">已使用／無法回收</strong><br />保留扣庫存結果</span
                >
              </label>
            </fieldset>
            <div class="mt-5 flex justify-end gap-2">
              <button
                type="button"
                class="btn bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm"
                @click="closeCancellation"
              >
                返回
              </button>
              <button
                type="submit"
                class="btn bg-danger-600 text-white hover:bg-danger-700 text-sm"
              >
                確認取消
              </button>
            </div>
          </form>
        </div>
        <div
          v-if="batchConfirmOpen"
          class="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/35 p-4"
        >
          <form
            class="w-full max-w-lg rounded-card bg-white p-6 shadow-xl"
            @submit.prevent="confirmSelectedRecords"
          >
            <h3 class="text-lg font-semibold text-slate-800">批次確認寄出</h3>
            <p class="mt-1 text-sm text-slate-600">
              即將確認 {{ selectedPendingRecords.length }} 筆待寄紀錄，並扣除下列郵票庫存。
            </p>
            <div class="mt-4 rounded-lg bg-slate-50 p-3">
              <p class="text-sm font-medium text-slate-700">
                總郵資：{{ selectedPendingPostage }} 元
              </p>
              <div class="mt-3 flex flex-wrap gap-1">
                <span
                  v-for="item in selectedPendingCombination"
                  :key="item.denomination"
                  class="inline-flex rounded-button border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700"
                  >{{ item.denomination }} 元 × {{ item.count }}</span
                >
              </div>
            </div>
            <p class="mt-3 text-xs text-slate-500">
              系統會先檢查所有選取紀錄的資料與庫存；任一筆不符合時，不會扣除任何庫存。
            </p>
            <div class="mt-5 flex justify-end gap-2">
              <button
                type="button"
                class="btn bg-slate-100 text-sm text-slate-700 hover:bg-slate-200"
                @click="batchConfirmOpen = false"
              >
                返回
              </button>
              <button
                type="submit"
                class="btn bg-success-600 text-sm text-white hover:bg-success-700"
              >
                確認寄出並扣庫存
              </button>
            </div>
          </form>
        </div>
        <div class="modal-footer flex justify-between items-center">
          <div class="text-xs text-slate-500 flex items-center space-x-1">
            <kbd class="px-2 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-mono"
              >F11</kbd
            ><span>或</span
            ><kbd class="px-2 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-mono"
              >Ctrl</kbd
            ><span>+</span
            ><kbd class="px-2 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-mono"
              >Enter</kbd
            ><span>切換全螢幕</span>
          </div>
          <button
            @click="$emit('close')"
            class="btn bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500 text-sm"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { POSTAGE_RATES } from '../composables/postageRates'
import { usePostageCombinator } from '../composables/usePostageCombinator'
import { downloadTextFile } from '../utils/fileDownload'
import ModalHeader from './ModalHeader.vue'
import AppIcon from './AppIcon.vue'
import CustomSelect from './CustomSelect.vue'
import ComboboxInput from './ComboboxInput.vue'
import CustomDatePicker from './CustomDatePicker.vue'

const props = defineProps({
  show: Boolean,
  records: { type: Array, default: () => [] },
  initialRecord: { type: Object, required: true },
  statisticsDate: { type: String, default: '' },
  stamps: { type: Array, default: () => [] },
})
const emit = defineEmits([
  'close',
  'save-pending',
  'confirm-record',
  'confirm-records',
  'delete-pending',
  'cancel-record',
])
const methods = [
  ...Object.entries(POSTAGE_RATES).map(([key, value]) => ({
    key,
    name: value.name,
    calculated: true,
  })),
  { key: 'parcel', name: '包裹', calculated: false },
  { key: 'express', name: '快捷', calculated: false },
]
const record = ref({})
const originalRecordSnapshot = ref('')
const recommendations = ref([])
const recommendationMessage = ref('')
const recommendationRequested = ref(false)
const activeTab = ref('entry')
const isFullscreen = ref(false)
const stampSource = computed(() => props.stamps)
const {
  weight: calculatorWeight,
  postage: calculatorPostage,
  errorMessage: calculatorError,
  calculatingCombinations,
  inventoryOnly,
  fewestStampsCombinations,
  fewestDenominationsCombinations,
  selectMailType,
  calculatePostage,
  calculateCombinationsForPostage,
  getFormattedStamps,
} = usePostageCombinator(stampSource)
const exportStart = ref('')
const exportEnd = ref('')
const filterText = ref('')
const filterStatus = ref('all')
const filterMethod = ref('all')
const filterStatusOptions = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待寄出' },
  { value: 'sent', label: '已寄出' },
  { value: 'cancelled', label: '已取消' },
]
const cancellingRecord = ref(null)
const cancellationReason = ref('')
const returnStock = ref(true)
const selectedPendingIds = ref([])
const batchConfirmOpen = ref(false)
const filterMethodOptions = computed(() => [
  { value: 'all', label: '全部' },
  ...methods.map(method => ({ value: method.key, label: method.name })),
])
const filteredRecords = computed(() => {
  const keyword = filterText.value.trim().toLowerCase()
  return props.records.filter(item => {
    const matchesStatus = filterStatus.value === 'all' || item.status === filterStatus.value
    const source = [item.recipient, item.sender, item.referenceNumber, item.trackingNumber]
      .join(' ')
      .toLowerCase()
    const matchesMethod = filterMethod.value === 'all' || item.mailType === filterMethod.value
    return matchesStatus && matchesMethod && (!keyword || source.includes(keyword))
  })
})
const todayRecordCount = computed(() => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .formatToParts(new Date())
    .reduce((result, part) => ({ ...result, [part.type]: part.value }), {})
  const today = `${parts.year}-${parts.month}-${parts.day}`
  return props.records.filter(item => item.sentDate === today).length
})
const pendingRecordCount = computed(
  () => props.records.filter(item => item.status === 'pending').length
)
const visiblePendingRecords = computed(() =>
  filteredRecords.value.filter(item => item.status === 'pending')
)
const pendingRecords = computed(() => props.records.filter(item => item.status === 'pending'))
const currentPendingIndex = computed(() =>
  pendingRecords.value.findIndex(item => item.id === record.value.id)
)
const canNavigatePrevious = computed(() => currentPendingIndex.value > 0)
const canNavigateNext = computed(
  () =>
    currentPendingIndex.value >= 0 && currentPendingIndex.value < pendingRecords.value.length - 1
)
const hasUnsavedRecordChanges = computed(
  () =>
    Boolean(record.value.id) &&
    Boolean(originalRecordSnapshot.value) &&
    JSON.stringify(record.value) !== originalRecordSnapshot.value
)
const selectedPendingRecords = computed(() => {
  const selectedIds = new Set(selectedPendingIds.value)
  return props.records.filter(item => item.status === 'pending' && selectedIds.has(item.id))
})
const allVisiblePendingSelected = computed(
  () =>
    visiblePendingRecords.value.length > 0 &&
    visiblePendingRecords.value.every(item => selectedPendingIds.value.includes(item.id))
)
const selectedPendingPostage = computed(() =>
  selectedPendingRecords.value.reduce((total, item) => total + (Number(item.postage) || 0), 0)
)
const selectedPendingCombination = computed(() => {
  const counts = new Map()
  selectedPendingRecords.value.forEach(record => {
    record.stampCombination.forEach(item => {
      counts.set(item.denomination, (counts.get(item.denomination) || 0) + item.count)
    })
  })
  return [...counts]
    .map(([denomination, count]) => ({ denomination, count }))
    .sort((a, b) => b.denomination - a.denomination)
})
watch(
  () => props.initialRecord,
  value => {
    record.value = JSON.parse(JSON.stringify(value))
    originalRecordSnapshot.value = JSON.stringify(record.value)
    recommendations.value = []
    recommendationMessage.value = ''
  },
  { immediate: true, deep: true }
)
watch(calculatorPostage, value => {
  if (value !== null) record.value.postage = value
})
watch(calculatingCombinations, isCalculating => {
  if (isCalculating || !recommendationRequested.value) return

  recommendationRequested.value = false
  if (!calculatorError.value && !calculatorRecommendations.value.length) {
    recommendationMessage.value =
      '目前庫存沒有可剛好湊足郵資的郵票組合，請補充庫存或手動調整面額與張數。'
  }
})
const method = computed(() => methods.find(item => item.key === record.value.mailType))
const canAutoCalculate = computed(() => method.value?.calculated)
const modalContentClass = computed(() =>
  isFullscreen.value
    ? 'modal-content w-screen h-screen max-w-none max-h-none m-0 rounded-none'
    : 'modal-content max-w-6xl'
)
const modalBodyClass = computed(() =>
  isFullscreen.value
    ? 'modal-body max-h-[calc(100vh-88px)] overflow-y-auto'
    : 'modal-body max-h-[75vh] overflow-y-auto'
)
const senderOptions = computed(() => [
  ...new Set(props.records.map(item => item.sender).filter(Boolean)),
])
const recipientOptions = computed(() => [
  ...new Set(props.records.map(item => item.recipient).filter(Boolean)),
])
const calculatorRecommendations = computed(() => {
  const seen = new Set()
  return [...fewestStampsCombinations.value, ...fewestDenominationsCombinations.value]
    .map(combo => ({
      key: combo.comboKey,
      count: combo.count,
      items: getFormattedStamps(combo.stamps).map(item => ({
        denomination: item.value,
        count: item.count,
      })),
    }))
    .filter(combo => !seen.has(combo.key) && seen.add(combo.key))
})
const trackingRequired = computed(() =>
  [
    'registered_letter',
    'registered_return_receipt_letter',
    'express_registered_letter',
    'express_registered_return_receipt_letter',
    'double_registered',
  ].includes(record.value.mailType)
)
const nameOf = type => methods.find(item => item.key === type)?.name || type
const statusLabel = item => {
  if (item.status === 'sent') return '已寄出'
  if (item.status === 'cancelled') {
    return item.stockReturned ? '取消已退回' : '取消未退回'
  }
  return '待寄出'
}
const statusClass = item => {
  if (item.status === 'sent') return 'text-success-700'
  if (item.status === 'cancelled') return 'text-slate-500'
  return 'text-amber-700'
}
const combinationText = items =>
  items?.map(item => `${item.denomination} 元 × ${item.count}`).join('、') || '未選擇'
const reset = () => {
  record.value = {
    id: '',
    status: 'pending',
    sentDate: props.statisticsDate || new Date().toISOString().slice(0, 10),
    sender: '',
    referenceNumber: '',
    recipient: '',
    recipientAddress: '',
    mailType: '',
    weight: null,
    postage: null,
    trackingNumber: '',
    stampCombination: [],
    notes: '',
    createdAt: '',
    confirmedAt: '',
    cancelledAt: '',
    cancellationReason: '',
    stockReturned: false,
  }
  recommendations.value = []
  recommendationMessage.value = ''
  originalRecordSnapshot.value = JSON.stringify(record.value)
}
const edit = item => {
  record.value = JSON.parse(JSON.stringify(item))
  originalRecordSnapshot.value = JSON.stringify(record.value)
  recommendations.value = []
  activeTab.value = 'entry'
}
const navigatePendingRecord = direction => {
  if (hasUnsavedRecordChanges.value) {
    const shouldDiscardChanges = window.confirm(
      '目前的修改尚未儲存，確定要切換到另一筆待寄紀錄嗎？'
    )
    if (!shouldDiscardChanges) return
  }

  const targetIndex = currentPendingIndex.value + direction
  const target = pendingRecords.value[targetIndex]
  if (target) edit(target)
}
const openCancellation = item => {
  cancellingRecord.value = item
  cancellationReason.value = ''
  returnStock.value = true
}
const closeCancellation = () => {
  cancellingRecord.value = null
  cancellationReason.value = ''
  returnStock.value = true
}
const togglePendingSelection = (id, selected) => {
  selectedPendingIds.value = selected
    ? [...new Set([...selectedPendingIds.value, id])]
    : selectedPendingIds.value.filter(item => item !== id)
}
const toggleAllVisiblePending = selected => {
  const visibleIds = visiblePendingRecords.value.map(item => item.id)
  selectedPendingIds.value = selected
    ? [...new Set([...selectedPendingIds.value, ...visibleIds])]
    : selectedPendingIds.value.filter(id => !visibleIds.includes(id))
}
const confirmSelectedRecords = () => {
  if (!selectedPendingRecords.value.length) return
  emit(
    'confirm-records',
    selectedPendingRecords.value.map(item => item.id)
  )
  selectedPendingIds.value = []
  batchConfirmOpen.value = false
}
const confirmCancellation = () => {
  if (!cancellingRecord.value || !cancellationReason.value.trim()) return
  emit('cancel-record', {
    id: cancellingRecord.value.id,
    reason: cancellationReason.value,
    returnStock: returnStock.value,
  })
  closeCancellation()
}
const fillRecipientAddress = () => {
  const match = props.records.find(
    item => item.recipient === record.value.recipient && item.recipientAddress
  )
  if (match) record.value.recipientAddress = match.recipientAddress
}
const manualCount = denomination =>
  record.value.stampCombination?.find(item => item.denomination === denomination)?.count || 0
const setManualCount = (denomination, value) => {
  const count = Math.max(0, Math.floor(Number(value) || 0))
  const combination = record.value.stampCombination.filter(
    item => item.denomination !== denomination
  )
  if (count) combination.push({ denomination, count })
  record.value.stampCombination = combination.sort((a, b) => b.denomination - a.denomination)
}
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
}
const handleKeydown = event => {
  if (event.key === 'F11' || (event.ctrlKey && event.key === 'Enter')) {
    event.preventDefault()
    toggleFullscreen()
  } else if (event.key === 'Escape' && isFullscreen.value) {
    event.preventDefault()
    isFullscreen.value = false
  }
}
const isSelected = combo =>
  JSON.stringify(record.value.stampCombination) === JSON.stringify(combo.items)
const calculate = () => {
  recommendationMessage.value = ''
  recommendationRequested.value = true
  inventoryOnly.value = true
  selectMailType(record.value.mailType)
  calculatorWeight.value = record.value.weight
  if (canAutoCalculate.value) calculatePostage()
  else calculateCombinationsForPostage(record.value.postage)
}
const savePending = () => {
  emit('save-pending', record.value)
  originalRecordSnapshot.value = JSON.stringify(record.value)
}
const confirmSent = () => emit('confirm-record', record.value)
const csvCell = value => `"${String(value ?? '').replaceAll('"', '""')}"`
const exportRecords = () => {
  const selected = props.records.filter(
    item =>
      item.status === 'sent' &&
      (!exportStart.value || item.sentDate >= exportStart.value) &&
      (!exportEnd.value || item.sentDate <= exportEnd.value)
  )
  const rows = [
    [
      '寄件日期',
      '寄件者',
      '文號／案件編號',
      '收件者',
      '收件地址',
      '郵寄方式',
      '掛號號碼',
      '重量（公克）',
      '郵資（元）',
      '郵票面額組合',
      '備註',
    ],
    ...selected.map(item => [
      item.sentDate,
      item.sender,
      item.referenceNumber,
      item.recipient,
      item.recipientAddress,
      nameOf(item.mailType),
      item.trackingNumber,
      item.weight ?? '',
      item.postage,
      combinationText(item.stampCombination),
      item.notes,
    ]),
    [],
    ['郵件種類', '件數', '總郵資（元）'],
  ]
  const summary = selected.reduce((result, item) => {
    const key = nameOf(item.mailType)
    result[key] ||= { count: 0, postage: 0 }
    result[key].count += 1
    result[key].postage += Number(item.postage) || 0
    return result
  }, {})
  Object.entries(summary).forEach(([name, value]) => rows.push([name, value.count, value.postage]))
  rows.push([
    '合計',
    selected.length,
    selected.reduce((total, item) => total + (Number(item.postage) || 0), 0),
  ])
  const range = `${exportStart.value || '開始'}至${exportEnd.value || '結束'}`
  downloadTextFile(
    `\uFEFF${rows.map(row => row.map(csvCell).join(',')).join('\r\n')}`,
    `郵寄紀錄_${range}.csv`,
    'text/csv;charset=utf-8'
  )
}
onMounted(() => document.addEventListener('keydown', handleKeydown))
onUnmounted(() => document.removeEventListener('keydown', handleKeydown))
</script>
