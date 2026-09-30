<template>
  <span
    class="app-icon"
    :class="$attrs.class"
    :style="{
      '--icon-url': `url(https://cdn.jsdelivr.net/npm/@mdi/svg@7.4.47/svg/${name}.svg)`,
      '--icon-size': size,
    }"
    :role="label ? 'img' : undefined"
    :aria-label="label || undefined"
    :aria-hidden="label ? undefined : 'true'"
  ></span>
</template>

<script setup>
defineOptions({ inheritAttrs: false })

defineProps({
  name: { type: String, required: true },
  label: { type: String, default: '' },
  size: { type: String, default: '1em' },
})
</script>

<style scoped>
.app-icon {
  display: inline-block;
  width: var(--icon-size);
  height: var(--icon-size);
  flex: none;
  background-color: currentColor;
  -webkit-mask: var(--icon-url) center / contain no-repeat;
  mask: var(--icon-url) center / contain no-repeat;
}
</style>
