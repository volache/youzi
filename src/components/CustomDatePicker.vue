<template>
  <div ref="root" class="relative mt-1">
    <button
      type="button"
      class="input flex h-[38px] w-full items-center justify-between bg-white text-left text-sm"
      @click="toggle"
    >
      <span :class="modelValue ? 'text-slate-700' : 'text-slate-400'">{{ displayValue }}</span>
      <AppIcon name="calendar-month-outline" size="1rem" class="text-primary-700" />
    </button>
    <Teleport to="body">
      <div
        v-if="open"
        ref="popover"
        class="fixed z-[100] w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
        :style="popoverStyle"
      >
        <div class="mb-3 flex items-center justify-between">
          <button type="button" class="rounded p-1 hover:bg-slate-100" @click="shiftMonth(-1)">
            <AppIcon name="chevron-left" /></button
          ><span class="text-sm font-semibold text-slate-700">{{ monthLabel }}</span
          ><button type="button" class="rounded p-1 hover:bg-slate-100" @click="shiftMonth(1)">
            <AppIcon name="chevron-right" />
          </button>
        </div>
        <div v-if="mode === 'date'" class="grid grid-cols-7 gap-1 text-center text-xs">
          <span v-for="day in weekdays" :key="day" class="py-1 text-slate-400">{{ day }}</span
          ><button
            v-for="day in days"
            :key="day.key"
            type="button"
            class="h-8 rounded transition-colors"
            :class="
              day.current
                ? day.value === modelValue
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-700 hover:bg-primary-50'
                : 'text-slate-300'
            "
            :disabled="!day.current"
            @click="choose(day.value)"
          >
            {{ day.label }}
          </button>
        </div>
        <div v-else class="grid grid-cols-3 gap-1 text-center text-sm">
          <button
            v-for="month in months"
            :key="month.value"
            type="button"
            class="rounded px-2 py-2 transition-colors"
            :class="
              month.value === modelValue
                ? 'bg-primary-600 text-white'
                : 'text-slate-700 hover:bg-primary-50'
            "
            @click="choose(month.value)"
          >
            {{ month.label }}月
          </button>
        </div>
        <button
          type="button"
          class="mt-3 w-full text-xs font-medium text-primary-700 hover:text-primary-900"
          @click="choose(mode === 'month' ? today.slice(0, 7) : today)"
        >
          今天
        </button>
      </div>
    </Teleport>
  </div>
</template>
<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
const props = defineProps({
  modelValue: { type: String, default: '' },
  mode: { type: String, default: 'date', validator: value => ['date', 'month'].includes(value) },
})
const emit = defineEmits(['update:modelValue'])
const root = ref(null),
  popover = ref(null),
  open = ref(false),
  cursor = ref(new Date()),
  popoverStyle = ref({})
const weekdays = ['日', '一', '二', '三', '四', '五', '六']
const taipeiDate = date => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .formatToParts(date)
    .reduce((result, part) => ({ ...result, [part.type]: part.value }), {})
  return `${parts.year}-${parts.month}-${parts.day}`
}
const today = taipeiDate(new Date())
watch(
  () => props.modelValue,
  value => {
    if (value) {
      const normalizedValue =
        props.mode === 'month' && /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : value
      cursor.value = new Date(`${normalizedValue}T00:00:00`)
    }
  },
  { immediate: true }
)
const displayValue = computed(() =>
  props.modelValue
    ? props.modelValue.replaceAll('-', '/')
    : props.mode === 'month'
      ? '年／月'
      : '年／月／日'
)
const monthLabel = computed(
  () => `${cursor.value.getFullYear()} 年 ${cursor.value.getMonth() + 1} 月`
)
const days = computed(() => {
  const year = cursor.value.getFullYear(),
    month = cursor.value.getMonth(),
    first = new Date(year, month, 1).getDay(),
    count = new Date(year, month + 1, 0).getDate()
  return Array.from({ length: first + count }, (_, i) => {
    const day = i - first + 1
    return {
      key: `${year}-${month}-${i}`,
      label: day > 0 ? day : '',
      current: day > 0,
      value:
        day > 0
          ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          : '',
    }
  })
})
const months = computed(() =>
  Array.from({ length: 12 }, (_, index) => ({
    value: `${cursor.value.getFullYear()}-${String(index + 1).padStart(2, '0')}`,
    label: index + 1,
  }))
)
const shiftMonth = amount => {
  cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() + amount, 1)
}
const choose = value => {
  emit('update:modelValue', value)
  open.value = false
}
const updatePopoverPosition = () => {
  if (!root.value) return
  const rect = root.value.getBoundingClientRect()
  const popoverWidth = 288
  const estimatedHeight = props.mode === 'month' ? 232 : 308
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - popoverWidth - 8))
  const below = rect.bottom + 4
  const top =
    below + estimatedHeight <= window.innerHeight
      ? below
      : Math.max(8, rect.top - estimatedHeight - 4)
  popoverStyle.value = { left: `${left}px`, top: `${top}px` }
}
const toggle = async () => {
  open.value = !open.value
  if (open.value) {
    await nextTick()
    updatePopoverPosition()
  }
}
const outside = event => {
  if (!root.value?.contains(event.target) && !popover.value?.contains(event.target))
    open.value = false
}
onMounted(() => {
  document.addEventListener('click', outside)
  window.addEventListener('resize', updatePopoverPosition)
  window.addEventListener('scroll', updatePopoverPosition, true)
})
onUnmounted(() => {
  document.removeEventListener('click', outside)
  window.removeEventListener('resize', updatePopoverPosition)
  window.removeEventListener('scroll', updatePopoverPosition, true)
})
</script>
