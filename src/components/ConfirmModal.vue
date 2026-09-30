<template>
  <Transition name="modal-fade">
    <div v-if="show" class="modal-overlay">
      <Transition name="modal-content-fade">
        <div
          v-if="show"
          class="modal-content max-w-md p-6"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          aria-describedby="confirm-modal-message"
        >
          <!-- 圖示區域 -->
          <div
            class="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full"
            :class="iconBgClass"
          >
            <AppIcon :name="iconName" class="w-6 h-6" :class="iconClass" />
          </div>

          <!-- 標題 -->
          <h3 id="confirm-modal-title" class="modal-title text-lg text-center text-slate-800 mb-2">
            {{ title }}
          </h3>

          <!-- 訊息內容 -->
          <p id="confirm-modal-message" class="text-slate-600 text-center mb-6 leading-relaxed">
            {{ message }}
          </p>

          <!-- 按鈕區域 -->
          <div class="flex justify-center space-x-3">
            <button v-if="showCancel" @click="handleCancel" class="btn-outline text-sm">
              {{ cancelText }}
            </button>
            <button @click="handleConfirm" class="btn text-sm" :class="confirmButtonClass">
              {{ confirmText }}
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  type: {
    type: String,
    default: 'info', // info, warning, error, success
    validator: value => ['info', 'warning', 'error', 'success'].includes(value),
  },
  title: {
    type: String,
    default: '確認',
  },
  message: {
    type: String,
    required: true,
  },
  confirmText: {
    type: String,
    default: '確定',
  },
  cancelText: {
    type: String,
    default: '取消',
  },
  showCancel: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['confirm', 'cancel', 'close'])

// 根據類型計算圖示和樣式
const iconName = computed(() => {
  const icons = {
    info: 'information-outline',
    warning: 'alert-outline',
    error: 'alert-circle-outline',
    success: 'check-circle-outline',
  }
  return icons[props.type]
})

const iconBgClass = computed(() => {
  const classes = {
    info: 'bg-secondary-100',
    warning: 'bg-warning-100',
    error: 'bg-danger-100',
    success: 'bg-success-100',
  }
  return classes[props.type]
})

const iconClass = computed(() => {
  const classes = {
    info: 'text-secondary-600',
    warning: 'text-warning-600',
    error: 'text-danger-600',
    success: 'text-success-600',
  }
  return classes[props.type]
})

const confirmButtonClass = computed(() => {
  const classes = {
    info: 'btn-secondary',
    warning: 'btn-warning',
    error: 'btn-danger',
    success: 'btn-success',
  }
  return classes[props.type]
})

const handleConfirm = () => {
  emit('confirm')
  emit('close')
}

const handleCancel = () => {
  emit('cancel')
  emit('close')
}
</script>

<style scoped>
/* 組件特定樣式 - 全域樣式已在 style.css 中定義 */
</style>
