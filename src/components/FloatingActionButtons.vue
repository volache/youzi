<template>
  <div class="fixed bottom-6 right-6 z-10">
    <!-- 主按鈕 -->
    <button
      @click="toggleMenu"
      class="fab fab-main group"
      :title="isMenuOpen ? '關閉選單' : '開啟選單'"
      :aria-expanded="isMenuOpen"
      aria-label="浮動操作選單"
    >
      <AppIcon
        name="plus-circle-outline"
        size="1.5rem"
        class="transition-transform duration-200 group-hover:rotate-45"
        :class="{ 'rotate-45': isMenuOpen }"
      />
    </button>

    <!-- 展開的子按鈕選單 -->
    <Transition name="fab-menu">
      <div v-if="isMenuOpen" class="absolute bottom-20 right-0 w-max space-y-3">
        <!-- 歷史採購紀錄按鈕 -->
        <div class="flex items-center justify-end space-x-3 w-full">
          <span
            class="fab-label"
            :class="{ 'fab-label-show': isMenuOpen }"
            style="transition-delay: 100ms"
          >
            歷史採購紀錄
          </span>
          <button
            @click="handleHistory"
            @mouseenter="startFabMotion('folder')"
            @mouseleave="endFabMotion('folder')"
            class="fab bg-fuchsia-500 hover:bg-fuchsia-600 text-white focus:ring-fuchsia-300 group"
            title="歷史紀錄"
          >
            <AppIcon
              name="folder-outline"
              size="1.25rem"
              class="fab-icon-folder"
              :class="motionClass('folder')"
            />
          </button>
        </div>

        <!-- 採購規則設定按鈕 -->
        <div class="flex items-center justify-end space-x-3 w-full">
          <span
            class="fab-label"
            :class="{ 'fab-label-show': isMenuOpen }"
            style="transition-delay: 125ms"
          >
            採購規則設定
          </span>
          <button
            @click="handleAdvancedSettings"
            @mouseenter="startFabMotion('gear')"
            @mouseleave="endFabMotion('gear')"
            class="fab bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-300 group"
            title="採購規則設定"
          >
            <AppIcon
              name="cog-outline"
              size="1.25rem"
              class="fab-icon-gear"
              :class="motionClass('gear')"
            />
          </button>
        </div>

        <!-- 郵資組合計算器按鈕 -->
        <div class="flex items-center justify-end space-x-3 w-full">
          <span
            class="fab-label"
            :class="{ 'fab-label-show': isMenuOpen }"
            style="transition-delay: 150ms"
          >
            郵資組合計算器
          </span>
          <button
            @click="handlePostageCombinator"
            @mouseenter="startFabMotion('calculator')"
            @mouseleave="endFabMotion('calculator')"
            class="fab bg-warning-500 hover:bg-warning-600 text-white focus:ring-warning-300 group"
            title="郵資組合計算器"
          >
            <AppIcon
              name="calculator-variant-outline"
              size="1.25rem"
              class="fab-icon-calculator"
              :class="motionClass('calculator')"
            />
          </button>
        </div>

        <!-- 匯出 CSV 按鈕 -->
        <div class="flex items-center justify-end space-x-3 w-full">
          <span
            class="fab-label"
            :class="{ 'fab-label-show': isMenuOpen }"
            style="transition-delay: 175ms"
          >
            匯出 CSV
          </span>
          <button
            @click="handleExportCSV"
            @mouseenter="startFabMotion('download')"
            @mouseleave="endFabMotion('download')"
            class="fab bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-300 group"
            title="匯出 CSV"
          >
            <AppIcon
              name="download-outline"
              size="1.25rem"
              class="fab-icon-download"
              :class="motionClass('download')"
            />
          </button>
        </div>
      </div>
    </Transition>

    <!-- 背景遮罩 -->
    <Transition name="backdrop">
      <div
        v-if="isMenuOpen"
        @click="closeMenu"
        class="fixed inset-0 bg-black bg-opacity-20 -z-10"
      ></div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import AppIcon from './AppIcon.vue'

const emit = defineEmits([
  'open-history-modal',
  'open-advanced-settings-modal',
  'open-postage-combinator-modal',
  'show-export-options',
])

defineProps({
  hasReportData: {
    type: Boolean,
    default: false,
  },
})

const isMenuOpen = ref(false)
const activeFabMotion = ref('')
const leavingFabMotion = ref('')
let motionTimer

const motionClass = name => ({
  'fab-motion-in': activeFabMotion.value === name,
  'fab-motion-out': leavingFabMotion.value === name,
})

const startFabMotion = name => {
  clearTimeout(motionTimer)
  leavingFabMotion.value = ''
  activeFabMotion.value = name
}

const endFabMotion = name => {
  if (activeFabMotion.value !== name) return
  activeFabMotion.value = ''
  leavingFabMotion.value = name
  motionTimer = setTimeout(() => {
    if (leavingFabMotion.value === name) leavingFabMotion.value = ''
  }, 720)
}

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const closeMenu = () => {
  isMenuOpen.value = false
}

// 處理各種操作並關閉選單
const handleHistory = () => {
  emit('open-history-modal')
  closeMenu()
}

const handleAdvancedSettings = () => {
  emit('open-advanced-settings-modal')
  closeMenu()
}

const handlePostageCombinator = () => {
  emit('open-postage-combinator-modal')
  closeMenu()
}

const handleExportCSV = () => {
  emit('show-export-options')
  closeMenu()
}

// 點擊外部關閉選單
const handleClickOutside = event => {
  if (isMenuOpen.value && !event.target.closest('.fixed.bottom-6.right-6')) {
    closeMenu()
  }
}

// ESC 鍵關閉選單
const handleEscKey = event => {
  if (event.key === 'Escape' && isMenuOpen.value) {
    closeMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleEscKey)
})

onUnmounted(() => {
  clearTimeout(motionTimer)
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleEscKey)
})
</script>

<style scoped>
/* 組件特定樣式 - 全域樣式已在 style.css 中定義 */
</style>
