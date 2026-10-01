<template>
  <div ref="root" class="relative mt-1">
    <input
      :value="modelValue"
      class="input h-9 w-full pr-8 text-sm"
      :placeholder="placeholder"
      @focus="open = true"
      @input="update($event.target.value)"
    /><AppIcon
      name="chevron-down"
      size="1rem"
      class="pointer-events-none absolute right-3 top-2.5 text-slate-400"
    />
    <div
      v-if="open && matches.length"
      class="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
    >
      <button
        v-for="option in matches"
        :key="option"
        type="button"
        class="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-primary-50"
        @click="choose(option)"
      >
        {{ option }}
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
  placeholder: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue', 'select'])
const root = ref(null),
  open = ref(false)
const matches = computed(() =>
  props.options.filter(value => value.includes(props.modelValue)).slice(0, 8)
)
const update = value => {
  emit('update:modelValue', value)
  open.value = true
}
const choose = value => {
  emit('update:modelValue', value)
  emit('select', value)
  open.value = false
}
const outside = event => {
  if (!root.value?.contains(event.target)) open.value = false
}
onMounted(() => document.addEventListener('click', outside))
onUnmounted(() => document.removeEventListener('click', outside))
</script>
