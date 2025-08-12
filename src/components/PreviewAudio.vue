<template>
  <div class="absolute right-3 top-3">
    <Button
      icon="pi pi-times"
      severity="secondary"
      rounded
      @click="onClose"
    ></Button>
  </div>
  <div class="flex flex-col items-center justify-center gap-4">
    <div class="rounded-lg bg-white/20 px-4 py-2 text-2xl">{{ item.name }}</div>
    <audio
      class="w-full"
      :src="item.fullname ? `/image-browsing${item.fullname}` : ''"
      autoplay
      controls
    ></audio>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import { DirectoryItem } from 'types/typings'

interface Props {
  item: DirectoryItem
  onClose: () => void
}

defineProps<Props>()
</script>
