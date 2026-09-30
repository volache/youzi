<template>
  <footer class="mt-12 text-center text-base text-slate-500">
    <p>&copy; {{ new Date().getFullYear() }} 郵資大師｜版本 {{ APP_VERSION }}</p>
  </footer>
</template>

<script setup>
import { APP_VERSION } from '../config/appInfo'
</script>
