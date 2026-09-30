<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast" tag="div" class="toast-list">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast-item flex items-center p-4 rounded-lg shadow-lg backdrop-blur-sm border max-w-sm"
          :class="getToastClasses(toast.type)"
        >
          <!-- 圖示 -->
          <div class="flex-shrink-0 mr-3">
            <AppIcon
              :name="getIconName(toast.type)"
              class="w-5 h-5"
              :class="getIconClasses(toast.type)"
            />
          </div>

          <!-- 內容 -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium" :class="getTitleClasses(toast.type)">
              {{ toast.title }}
            </p>
            <p v-if="toast.message" class="text-sm mt-1" :class="getMessageClasses(toast.type)">
              {{ toast.message }}
            </p>
          </div>

          <!-- 關閉按鈕 -->
          <button
            @click="removeToast(toast.id)"
            class="flex-shrink-0 ml-3 p-1 rounded-md transition-colors duration-200"
            :class="getCloseButtonClasses(toast.type)"
          >
            <AppIcon name="close-circle-outline" size="1rem" label="關閉通知" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import AppIcon from './AppIcon.vue'

const toasts = ref([])
let toastId = 0

// 添加 Toast
const addToast = toast => {
  const id = ++toastId
  const newToast = {
    id,
    type: toast.type || 'info',
    title: toast.title || '通知',
    message: toast.message || '',
    duration: toast.duration || 4000,
  }

  toasts.value.push(newToast)

  // 自動移除
  if (newToast.duration > 0) {
    setTimeout(() => {
      removeToast(id)
    }, newToast.duration)
  }

  return id
}

// 移除 Toast
const removeToast = id => {
  const index = toasts.value.findIndex(toast => toast.id === id)
  if (index > -1) {
    toasts.value.splice(index, 1)
  }
}

// 清除所有 Toast
const clearToasts = () => {
  toasts.value = []
}

// 樣式計算函數
const getToastClasses = type => {
  const classes = {
    success: 'bg-success-50 border-success-200',
    error: 'bg-danger-50 border-danger-200',
    warning: 'bg-warning-50 border-warning-200',
    info: 'bg-secondary-50 border-secondary-200',
  }
  return classes[type] || classes.info
}

const getIconName = type => {
  const icons = {
    success: 'check-circle-outline',
    error: 'alert-circle-outline',
    warning: 'alert-outline',
    info: 'information-outline',
  }
  return icons[type] || icons.info
}

const getIconClasses = type => {
  const classes = {
    success: 'text-success-600',
    error: 'text-danger-600',
    warning: 'text-warning-600',
    info: 'text-secondary-600',
  }
  return classes[type] || classes.info
}

const getTitleClasses = type => {
  const classes = {
    success: 'text-success-800',
    error: 'text-danger-800',
    warning: 'text-warning-800',
    info: 'text-secondary-800',
  }
  return classes[type] || classes.info
}

const getMessageClasses = type => {
  const classes = {
    success: 'text-success-700',
    error: 'text-danger-700',
    warning: 'text-warning-700',
    info: 'text-secondary-700',
  }
  return classes[type] || classes.info
}

const getCloseButtonClasses = type => {
  const classes = {
    success: 'text-success-600 hover:text-success-800 hover:bg-success-100',
    error: 'text-danger-600 hover:text-danger-800 hover:bg-danger-100',
    warning: 'text-warning-600 hover:text-warning-800 hover:bg-warning-100',
    info: 'text-secondary-600 hover:text-secondary-800 hover:bg-secondary-100',
  }
  return classes[type] || classes.info
}

// 全域事件監聽
const handleToastEvent = event => {
  addToast(event.detail)
}

onMounted(() => {
  window.addEventListener('show-toast', handleToastEvent)
})

onUnmounted(() => {
  window.removeEventListener('show-toast', handleToastEvent)
})

// 暴露方法給外部使用
defineExpose({
  addToast,
  removeToast,
  clearToasts,
})
</script>

<style scoped>
/* Toast 容器樣式 */
.toast-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 60;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  pointer-events: none;
}

.toast-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.toast-item {
  pointer-events: auto;
  margin-bottom: 0 !important;
}

/* 確保動畫不會影響間距 */
.toast-item + .toast-item {
  margin-top: 0.5rem;
}
</style>
