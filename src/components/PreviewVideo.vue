<template>
  <div class="absolute right-3 top-3 z-10">
    <Button
      icon="pi pi-times"
      severity="secondary"
      rounded
      @click="onClose"
    ></Button>
  </div>
  <div class="flex h-full w-full select-none items-center justify-center">
    <video
      class="h-full w-full object-contain"
      :src="item.fullname ? `/image-browsing${item.fullname}` : ''"
      autofocus
      autoplay
      controls
    ></video>
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
