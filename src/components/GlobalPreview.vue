<template>
  <div
    v-show="visible"
    class="fixed left-0 top-0 z-[5000] flex h-full w-full items-center justify-center bg-black/40 dark:bg-black/60"
    @click="close"
  >
    <div class="absolute right-3 top-3" @click.stop="">
      <Button
        icon="pi pi-times"
        severity="secondary"
        rounded
        @click="close"
      ></Button>
    </div>
    <div class="h-auto w-max select-none" @click.stop="">
      <img :src="`/image-browsing${current?.fullname}`" alt="preview" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePreview } from 'hooks/preview'
import Button from 'primevue/button'

const { visible, current, close } = usePreview()
</script>
