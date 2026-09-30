import { ref } from 'vue'

// 全域狀態
const confirmModal = ref({
  show: false,
  type: 'info',
  title: '確認',
  message: '',
  confirmText: '確定',
  cancelText: '取消',
  showCancel: true,
  onConfirm: null,
  onCancel: null,
})

export function useNotifications() {
  // Toast 通知函數
  const showToast = options => {
    const event = new CustomEvent('show-toast', {
      detail: {
        type: options.type || 'info',
        title: options.title || '通知',
        message: options.message || '',
        duration: options.duration || 4000,
      },
    })
    window.dispatchEvent(event)
  }

  // 成功 Toast
  const showSuccessToast = (title, message = '', duration = 4000) => {
    showToast({ type: 'success', title, message, duration })
  }

  // 錯誤 Toast
  const showErrorToast = (title, message = '', duration = 5000) => {
    showToast({ type: 'error', title, message, duration })
  }

  // 警告 Toast
  const showWarningToast = (title, message = '', duration = 4000) => {
    showToast({ type: 'warning', title, message, duration })
  }

  // 顯示確認 Modal
  const showConfirmModal = options => {
    return new Promise(resolve => {
      confirmModal.value = {
        show: true,
        type: options.type || 'info',
        title: options.title || '確認',
        message: options.message || '',
        confirmText: options.confirmText || '確定',
        cancelText: options.cancelText || '取消',
        showCancel: options.showCancel !== false,
        onConfirm: () => {
          confirmModal.value.show = false
          resolve(true)
        },
        onCancel: () => {
          confirmModal.value.show = false
          resolve(false)
        },
      }
    })
  }

  // 替代原生 alert 的函數
  const alert = async (message, title = '提示', type = 'info') => {
    await showConfirmModal({
      type,
      title,
      message,
      confirmText: '確定',
      showCancel: false,
    })
  }

  // 替代原生 confirm 的函數
  const confirm = async (message, title = '確認', type = 'warning') => {
    return await showConfirmModal({
      type,
      title,
      message,
      confirmText: '確定',
      cancelText: '取消',
    })
  }

  // 處理確認
  const handleConfirm = () => {
    if (confirmModal.value.onConfirm) {
      confirmModal.value.onConfirm()
    }
  }

  // 處理取消
  const handleCancel = () => {
    if (confirmModal.value.onCancel) {
      confirmModal.value.onCancel()
    }
  }

  return {
    // Modal 狀態
    confirmModal,

    // Toast 方法
    showToast,
    showSuccessToast,
    showErrorToast,
    showWarningToast,

    // Modal 方法
    showConfirmModal,

    // 替代原生方法
    alert,
    confirm,

    // Modal 控制
    handleConfirm,
    handleCancel,
  }
}
