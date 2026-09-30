<template>
  <div class="modal-header">
    <h3 :id="titleId" class="modal-title flex items-center" :class="titleClass">
      {{ title }}
      <span v-if="isFullscreen" class="ml-2 text-sm font-normal opacity-80">（全螢幕模式）</span>
    </h3>
    <div class="flex items-center space-x-2">
      <button
        v-if="fullscreenEnabled"
        type="button"
        class="group rounded-lg p-2 text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50"
        :title="isFullscreen ? '退出全螢幕' : '全螢幕模式'"
        :aria-label="isFullscreen ? '退出全螢幕' : '切換為全螢幕模式'"
        @click="$emit('toggle-fullscreen')"
      >
        <AppIcon
          :name="isFullscreen ? 'fullscreen-exit' : 'fullscreen'"
          class="transition-transform duration-200 group-hover:scale-110"
          size="1.25rem"
        />
      </button>
      <button type="button" class="modal-close" aria-label="關閉視窗" @click="$emit('close')">
        <AppIcon name="close" size="1.5rem" />
      </button>
    </div>
  </div>
</template>

<script setup>
import AppIcon from './AppIcon.vue'

defineProps({
  title: { type: String, required: true },
  titleId: { type: String, required: true },
  titleClass: { type: String, default: 'text-slate-700' },
  fullscreenEnabled: { type: Boolean, default: false },
  isFullscreen: { type: Boolean, default: false },
})

defineEmits(['close', 'toggle-fullscreen'])
</script>
