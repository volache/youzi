<template>
  <Transition name="modal-fade">
    <div v-if="show" class="modal-overlay">
      <Transition name="modal-content-fade">
        <div
          v-if="show"
          :class="modalContentClass"
          role="dialog"
          aria-modal="true"
          aria-labelledby="postage-combinator-title"
        >
          <ModalHeader
            title="郵資組合計算器"
            title-id="postage-combinator-title"
            title-class="text-warning-600"
            fullscreen-enabled
            :is-fullscreen="isFullscreen"
            @toggle-fullscreen="toggleFullscreen"
            @close="$emit('close')"
          />

          <!-- 主要內容區域：左右兩欄佈局 -->
          <div :class="modalBodyClass">
            <!-- 左欄：郵件種類選擇 -->
            <div class="lg:col-span-1 left-panel flex h-full flex-col overflow-y-auto pr-1">
              <h4 class="text-lg font-semibold text-slate-700 mb-3">郵件種類</h4>
              <div class="space-y-2 flex-1">
                <!-- 普通郵件組 -->
                <button
                  @click="selectMailType('ordinary_letter')"
                  :class="getMailTypeButtonClass('ordinary_letter')"
                >
                  普通信函
                </button>

                <button
                  @click="selectMailType('registered_letter')"
                  :class="getMailTypeButtonClass('registered_letter')"
                >
                  普通掛號
                </button>

                <button
                  @click="selectMailType('registered_return_receipt_letter')"
                  :class="getMailTypeButtonClass('registered_return_receipt_letter')"
                >
                  普通掛號附回執
                </button>

                <!-- 分隔線 -->
                <div class="border-t border-slate-300 my-2"></div>

                <!-- 限時郵件組 -->
                <button
                  @click="selectMailType('express_letter')"
                  :class="getMailTypeButtonClass('express_letter')"
                >
                  限時信函
                </button>

                <button
                  @click="selectMailType('express_registered_letter')"
                  :class="getMailTypeButtonClass('express_registered_letter')"
                >
                  限時掛號
                </button>

                <button
                  @click="selectMailType('express_registered_return_receipt_letter')"
                  :class="getMailTypeButtonClass('express_registered_return_receipt_letter')"
                >
                  限時掛號附回執
                </button>

                <!-- 分隔線 -->
                <div class="border-t border-slate-300 my-2"></div>

                <!-- 印刷品組 -->
                <button
                  @click="selectMailType('ordinary_printed_matter')"
                  :class="getMailTypeButtonClass('ordinary_printed_matter')"
                >
                  普通印刷物
                </button>
              </div>

              <!-- 重量輸入和計算按鈕 -->
              <div v-if="selectedMailType" class="mt-4 border-t border-slate-200 pt-4">
                <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <label for="weight" class="text-lg font-semibold text-slate-700"
                    >重量（公克）</label
                  >
                  <label
                    class="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800 cursor-pointer transition-colors hover:bg-amber-100"
                  >
                    <input
                      v-model="inventoryOnly"
                      type="checkbox"
                      class="h-4 w-4 rounded border-amber-400 accent-amber-500 focus:ring-amber-400"
                    />
                    只使用現有庫存
                  </label>
                </div>
                <input
                  type="number"
                  id="weight"
                  v-model.number="weight"
                  min="0"
                  step="0.1"
                  placeholder="例如：25"
                  @keyup.enter="handleEnterKey"
                  class="input w-full text-sm focus:ring-warning-500 focus:border-warning-500 mb-3 weight-input"
                />
                <button
                  @click="calculatePostage"
                  :disabled="!canCalculate || calculatingCombinations"
                  class="w-full btn bg-warning-500 hover:bg-warning-600 text-white focus:outline-none focus:ring-0 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed calculate-button"
                >
                  <span v-if="calculatingCombinations" class="flex items-center justify-center">
                    <AppIcon name="loading" class="-ml-1 mr-2 animate-spin" size="1rem" />
                    計算中...
                  </span>
                  <span v-else>計算郵資</span>
                </button>
                <p class="mt-2 text-xs leading-5 text-slate-500">
                  費率核對日期：{{ POSTAGE_RATE_METADATA.verifiedDate }}。
                  <a
                    :href="POSTAGE_RATE_METADATA.sourceUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="font-medium text-warning-700 underline decoration-warning-300 underline-offset-2 hover:text-warning-800"
                  >
                    查看中華郵政資費表
                  </a>
                </p>
              </div>
            </div>

            <!-- 右欄：計算結果和郵票組合 -->
            <div class="lg:col-span-2 right-panel flex flex-col h-full overflow-hidden">
              <!-- 錯誤訊息 -->
              <div
                v-if="errorMessage"
                class="mb-4 p-3 bg-danger-100 border border-danger-400 text-danger-700 rounded-card text-sm"
              >
                {{ errorMessage }}
              </div>

              <!-- 計算結果 -->
              <div v-if="postage !== null" class="space-y-4 flex-1 overflow-y-auto">
                <div class="p-3 bg-warning-50 rounded-card border border-warning-200">
                  <h4 class="text-lg font-semibold text-warning-700 mb-1">計算結果</h4>
                  <p class="text-base text-warning-600">
                    所需郵資：<span class="font-bold">{{ postage }} 元</span>
                  </p>
                </div>

                <!-- 郵票組合結果：雙欄並排佈局 -->
                <div
                  v-if="!calculatingCombinations"
                  class="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 combination-results"
                >
                  <!-- 張數最少組合 -->
                  <div class="bg-slate-50 p-4 rounded-card flex flex-col h-full">
                    <h4 class="text-base font-semibold text-slate-700 mb-3 flex items-center">
                      <AppIcon
                        name="sort-ascending"
                        class="mr-2 text-secondary-500"
                        size="1.25rem"
                      />
                      張數最少組合（前 5 名）
                    </h4>
                    <div
                      v-if="fewestStampsCombinations.length > 0"
                      class="space-y-2 flex-1 overflow-y-auto"
                    >
                      <div
                        v-for="(combination, index) in fewestStampsCombinations"
                        :key="'fewest-stamps-' + index"
                        :class="[
                          'p-3 rounded-button border transition-all duration-200 relative combination-card',
                          combination.bgColor,
                        ]"
                      >
                        <!-- 偏好指標 -->
                        <div class="absolute top-2 right-2 flex items-center space-x-1">
                          <!-- 最愛按鈕 -->
                          <button
                            @click="toggleCombinationFavorite(combination.fullKey)"
                            :class="[
                              'p-1 rounded-full transition-all duration-200 hover:scale-110',
                              combination.isFavorite
                                ? 'text-yellow-500 hover:text-yellow-600'
                                : 'text-slate-300 hover:text-yellow-400',
                            ]"
                            :title="combination.isFavorite ? '取消最愛' : '加入最愛'"
                          >
                            <AppIcon
                              :name="combination.isFavorite ? 'star' : 'star-outline'"
                              size="1rem"
                            />
                          </button>

                          <!-- 投票按鈕 -->
                          <button
                            @click="recordCombinationUsage(combination.fullKey)"
                            class="p-1 rounded-full text-slate-400 hover:text-green-500 transition-all duration-200 hover:scale-110"
                            title="選用此組合"
                          >
                            <AppIcon name="thumb-up-outline" size="1rem" />
                          </button>
                        </div>

                        <div class="flex flex-wrap items-center gap-1 mb-1 pr-20">
                          <span
                            v-for="(stamp, sIndex) in getFormattedStamps(combination.stamps)"
                            :key="sIndex"
                            class="inline-flex items-center px-2 py-1 bg-white border border-slate-300 rounded-button text-xs font-medium text-slate-700 stamp-tag"
                          >
                            {{ stamp.value }} 元×{{ stamp.count }}
                          </span>
                        </div>

                        <div class="flex items-center justify-between">
                          <p class="text-xs text-slate-600 info-text">
                            共 {{ combination.count }} 張
                          </p>
                          <div class="flex items-center space-x-2 text-xs text-slate-500">
                            <span v-if="combination.usageCount > 0" class="flex items-center">
                              <AppIcon name="chart-bar" class="mr-1" size="0.75rem" />
                              {{ combination.usageCount }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p v-else class="text-slate-500 text-center py-4 text-sm">沒有符合條件的組合</p>
                  </div>

                  <!-- 種類最少組合 -->
                  <div class="bg-slate-50 p-4 rounded-card flex flex-col h-full">
                    <h4 class="text-base font-semibold text-slate-700 mb-3 flex items-center">
                      <AppIcon name="layers-outline" class="mr-2 text-success-500" size="1.25rem" />
                      種類最少組合（前 5 名）
                    </h4>
                    <div
                      v-if="fewestDenominationsCombinations.length > 0"
                      class="space-y-2 flex-1 overflow-y-auto"
                    >
                      <div
                        v-for="(combination, index) in fewestDenominationsCombinations"
                        :key="'fewest-denominations-' + index"
                        :class="[
                          'p-3 rounded-button border transition-all duration-200 relative combination-card',
                          combination.bgColor,
                        ]"
                      >
                        <!-- 偏好指標 -->
                        <div class="absolute top-2 right-2 flex items-center space-x-1">
                          <!-- 最愛按鈕 -->
                          <button
                            @click="toggleCombinationFavorite(combination.fullKey)"
                            :class="[
                              'p-1 rounded-full transition-all duration-200 hover:scale-110',
                              combination.isFavorite
                                ? 'text-yellow-500 hover:text-yellow-600'
                                : 'text-slate-300 hover:text-yellow-400',
                            ]"
                            :title="combination.isFavorite ? '取消最愛' : '加入最愛'"
                          >
                            <AppIcon
                              :name="combination.isFavorite ? 'star' : 'star-outline'"
                              size="1rem"
                            />
                          </button>

                          <!-- 投票按鈕 -->
                          <button
                            @click="recordCombinationUsage(combination.fullKey)"
                            class="p-1 rounded-full text-slate-400 hover:text-green-500 transition-all duration-200 hover:scale-110"
                            title="選用此組合"
                          >
                            <AppIcon name="thumb-up-outline" size="1rem" />
                          </button>
                        </div>

                        <div class="flex flex-wrap items-center gap-1 mb-1 pr-20">
                          <span
                            v-for="(stamp, sIndex) in getFormattedStamps(combination.stamps)"
                            :key="sIndex"
                            class="inline-flex items-center px-2 py-1 bg-white border border-slate-300 rounded-button text-xs font-medium text-slate-700 stamp-tag"
                          >
                            {{ stamp.value }} 元×{{ stamp.count }}
                          </span>
                        </div>

                        <div class="flex items-center justify-between">
                          <p class="text-xs text-slate-600 info-text">
                            共 {{ combination.count }} 張，{{
                              combination.uniqueDenominationsCount
                            }}
                            種面額
                          </p>
                          <div class="flex items-center space-x-2 text-xs text-slate-500">
                            <span v-if="combination.usageCount > 0" class="flex items-center">
                              <AppIcon name="chart-bar" class="mr-1" size="0.75rem" />
                              {{ combination.usageCount }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p v-else class="text-slate-500 text-center py-4 text-sm">沒有符合條件的組合</p>
                  </div>
                </div>

                <!-- 計算中提示 -->
                <div v-if="calculatingCombinations" class="flex items-center justify-center py-8">
                  <div class="inline-flex items-center text-warning-600">
                    <AppIcon name="loading" class="-ml-1 mr-3 animate-spin" size="1.25rem" />
                    正在計算郵票組合...
                  </div>
                </div>

                <!-- 無組合提示 -->
                <div
                  v-if="
                    postage > 0 && !calculatingCombinations && fewestStampsCombinations.length === 0
                  "
                  class="flex items-center justify-center py-8"
                >
                  <p class="text-slate-500">找不到剛好符合的郵票組合。</p>
                </div>
              </div>

              <!-- 已選擇郵件種類但未輸入重量或未計算時的提示 -->
              <div
                v-else-if="selectedMailType && (!weight || postage === null)"
                class="flex items-center justify-center h-full"
              >
                <div class="text-center">
                  <AppIcon name="scale-balance" class="mx-auto mb-3 text-slate-400" size="3rem" />
                  <p class="text-slate-500 text-base">請輸入郵件重量</p>
                  <p class="text-slate-400 text-sm mt-1">在左側輸入重量後點擊計算郵資</p>
                </div>
              </div>

              <!-- 未選擇郵件種類時的提示 -->
              <div v-else-if="!selectedMailType" class="flex items-center justify-center h-full">
                <div class="text-center">
                  <AppIcon name="email-outline" class="mx-auto mb-3 text-slate-400" size="3rem" />
                  <p class="text-slate-500 text-base">請選擇郵件種類</p>
                  <p class="text-slate-400 text-sm mt-1">從左側選擇要計算的郵件類型</p>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer flex justify-between items-center">
            <!-- 左側：快捷鍵提示 -->
            <div class="flex items-center space-x-4">
              <!-- 快捷鍵提示 -->
              <div class="text-xs text-slate-500 hidden lg:block">
                <span class="inline-flex items-center">
                  <kbd
                    class="px-2 py-1 text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-200 rounded-lg"
                    >F11</kbd
                  >
                  <span class="mx-1">或</span>
                  <kbd
                    class="px-2 py-1 text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-200 rounded-lg"
                    >Ctrl</kbd
                  >
                  <span class="mx-1">+</span>
                  <kbd
                    class="px-2 py-1 text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-200 rounded-lg"
                    >Enter</kbd
                  >
                  <span class="ml-2">切換全螢幕</span>
                </span>
              </div>
            </div>

            <!-- 右側：偏好統計、管理按鈕和關閉按鈕 -->
            <div class="flex items-center space-x-4">
              <!-- 偏好統計 -->
              <div
                v-if="postage !== null"
                class="text-xs text-slate-500 flex items-center space-x-3"
              >
                <span class="flex items-center">
                  <AppIcon name="star" class="mr-1 text-yellow-500" size="0.75rem" />
                  {{ getCombinationStats().totalFavorites }} 個最愛
                </span>
                <span class="flex items-center">
                  <AppIcon name="chart-bar" class="mr-1 text-green-500" size="0.75rem" />
                  總使用 {{ getCombinationStats().totalUsage }} 次
                </span>
              </div>

              <!-- 偏好管理按鈕 -->
              <div class="relative group">
                <button
                  class="btn bg-secondary-100 hover:bg-secondary-200 text-secondary-700 focus:ring-secondary-500 text-sm flex items-center"
                  title="偏好管理"
                >
                  <AppIcon name="cog-outline" class="mr-2" size="1rem" />
                  偏好管理
                </button>

                <!-- 下拉選單 -->
                <div
                  class="absolute bottom-full right-0 mb-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50"
                >
                  <div class="p-2">
                    <button
                      v-if="postage !== null"
                      @click="clearCurrentPostagePreferences"
                      class="w-full text-left px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded-md transition-colors duration-200 mb-1"
                      :title="`清除郵資 ${postage} 元的組合偏好`"
                    >
                      <AppIcon name="tag-remove-outline" class="mr-2 align-middle" size="1rem" />
                      清除當前郵資偏好
                    </button>
                    <button
                      @click="clearAllPreferences"
                      class="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors duration-200"
                      title="清除所有偏好設定"
                    >
                      <AppIcon name="delete-outline" class="mr-2 align-middle" size="1rem" />
                      清除所有偏好
                    </button>
                  </div>
                </div>
              </div>

              <!-- 關閉按鈕 -->
              <button
                @click="$emit('close')"
                class="btn bg-warning-600 hover:bg-warning-700 text-white focus:ring-warning-500 text-sm"
              >
                關閉
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
import { usePostageCombinator } from '../composables/usePostageCombinator'
import { POSTAGE_RATE_METADATA } from '../composables/postageRates'
import ModalHeader from './ModalHeader.vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  show: Boolean,
  stamps: { type: Array, default: () => [] },
})

defineEmits(['close'])

const {
  // 響應式數據
  selectedMailType,
  weight,
  postage,
  errorMessage,
  calculatingCombinations,
  inventoryOnly,
  // 計算屬性
  canCalculate,
  fewestStampsCombinations,
  fewestDenominationsCombinations,

  // 方法
  selectMailType: originalSelectMailType,
  calculatePostage,
  getFormattedStamps,

  // 偏好管理方法
  recordCombinationUsage,
  toggleCombinationFavorite,
  getCombinationStats,
  clearCurrentPostagePreferences,
  clearAllPreferences,
} = usePostageCombinator(computed(() => props.stamps))

// 全螢幕狀態
const isFullscreen = ref(false)

// 計算屬性：模態視窗內容樣式
const modalContentClass = computed(() => {
  const baseClass = 'modal-content'
  if (isFullscreen.value) {
    return `${baseClass} w-screen h-screen max-w-none max-h-none m-0 rounded-none`
  }
  return `${baseClass} max-w-7xl`
})

// 計算屬性：模態視窗主體樣式
const modalBodyClass = computed(() => {
  if (isFullscreen.value) {
    return 'modal-body grid grid-cols-1 xl:grid-cols-5 gap-12 overflow-hidden h-[calc(100vh-140px)] max-w-full mx-[43px] px-8'
  }
  return 'modal-body grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden h-[calc(90vh-200px)]'
})

// 郵件種類按鈕樣式
const getMailTypeButtonClass = mailType => {
  const baseClass =
    'w-full px-3 py-2 rounded-button border-2 text-sm font-medium transition-all duration-250 text-left mail-type-button'
  const activeClass = 'border-warning-500 bg-warning-50 text-warning-700'
  const inactiveClass =
    'border-slate-300 bg-white text-slate-700 hover:border-warning-300 hover:bg-warning-50'

  return `${baseClass} ${selectedMailType.value === mailType ? activeClass : inactiveClass}`
}

const selectMailType = type => {
  originalSelectMailType(type)
  weight.value = null
}

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

// 處理 Enter 鍵事件
const handleEnterKey = () => {
  // 只有在可以計算時才執行
  if (canCalculate.value) {
    calculatePostage()
  }
}

// 生命週期鉤子
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>
