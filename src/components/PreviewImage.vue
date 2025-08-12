<template>
  <div class="absolute right-3 top-3">
    <Button
      icon="pi pi-times"
      severity="secondary"
      rounded
      @click="onClose"
    ></Button>
  </div>
  <div class="h-full w-full select-none p-10">
    <img
      class="h-full w-full object-contain"
      :src="item.fullname ? `/image-browsing${item.fullname}` : ''"
      alt="preview"
    />
  </div>
  <div class="absolute left-2 top-1/2">
    <Button
      icon="pi pi-angle-left"
      severity="secondary"
      rounded
      @click="onPrev"
    ></Button>
  </div>
  <div class="absolute right-2 top-1/2">
    <Button
      icon="pi pi-angle-right"
      severity="secondary"
      rounded
      @click="onNext"
    ></Button>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import { DirectoryItem } from 'types/typings'

interface Props {
  item: DirectoryItem
  onNext: () => void
  onPrev: () => void
  onClose: () => void
}

defineProps<Props>()
</script>
