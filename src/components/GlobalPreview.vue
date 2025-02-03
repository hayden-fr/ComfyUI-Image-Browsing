<template>
  <div
    v-show="visible"
    class="fixed left-0 top-0 z-[5000] flex h-full w-full items-center justify-center bg-black/40 dark:bg-black/60"
  >
    <div class="absolute right-3 top-3">
      <Button
        icon="pi pi-times"
        severity="secondary"
        rounded
        @click="close"
      ></Button>
    </div>
    <div class="h-full w-full select-none p-10">
      <img
        class="h-full w-full object-contain"
        :src="current?.fullname ? `/image-browsing${current?.fullname}` : ''"
        alt="preview"
      />
    </div>
    <div class="absolute left-2 top-1/2">
      <Button
        icon="pi pi-angle-left"
        severity="secondary"
        rounded
        @click="openPreviousImage"
      ></Button>
    </div>
    <div class="absolute right-2 top-1/2">
      <Button
        icon="pi pi-angle-right"
        severity="secondary"
        rounded
        @click="openNextImage"
      ></Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePreview } from 'hooks/preview'
import Button from 'primevue/button'

const { visible, current, close, openPreviousImage, openNextImage } =
  usePreview()
</script>
