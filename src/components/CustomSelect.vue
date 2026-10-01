<template>
  <div ref="root" class="relative mt-1">
    <button
      type="button"
      class="input flex h-9 w-full items-center justify-between text-left text-sm"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span>{{ selectedLabel }}</span
      ><AppIcon name="chevron-down" size="1rem" class="text-slate-500" />
    </button>
    <div
      v-if="open"
      class="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
    >
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="flex w-full rounded-md px-3 py-2 text-left text-sm hover:bg-primary-50"
        :class="
          option.value === modelValue
            ? 'bg-primary-50 text-primary-700 font-medium'
            : 'text-slate-700'
        "
        @click="choose(option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>
<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import AppIcon from './AppIcon.vue'
const props = defineProps({
  modelValue: { type: String, default: '' },
  options: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue'])
const root = ref(null),
  open = ref(false)
const selectedLabel = computed(
  () => props.options.find(option => option.value === props.modelValue)?.label || '請選擇'
)
const choose = value => {
  emit('update:modelValue', value)
  open.value = false
}
const outside = event => {
  if (!root.value?.contains(event.target)) open.value = false
}
onMounted(() => document.addEventListener('click', outside))
onUnmounted(() => document.removeEventListener('click', outside))
</script>
