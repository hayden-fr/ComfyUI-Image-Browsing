import { defineStore } from 'hooks/store'
import { DirectoryItem } from 'types/typings'
import { computed, ref } from 'vue'

export const usePreview = defineStore('preview', (store) => {
  const visible = ref(false)
  const current = ref<DirectoryItem>()
  const currentIndex = ref(0)

  const previewItems = computed(() => {
    return store.explorer.items.value.filter((item) => {
      return item.type === 'image'
    })
  })

  const openPreviousImage = () => {
    currentIndex.value--
    if (currentIndex.value < 0) {
      currentIndex.value = previewItems.value.length - 1
    }
    const item = previewItems.value[currentIndex.value]
    current.value = item
  }

  const openNextImage = () => {
    currentIndex.value++
    if (currentIndex.value > previewItems.value.length - 1) {
      currentIndex.value = 0
    }
    const item = previewItems.value[currentIndex.value]
    current.value = item
  }

  const previewKeyboardListener = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      close()
    }
    if (current.value?.type === 'image') {
      if (event.key === 'ArrowLeft') {
        openPreviousImage()
      }
      if (event.key === 'ArrowRight') {
        openNextImage()
      }
    }
  }

  const open = (item: DirectoryItem) => {
    visible.value = true
    current.value = item
    currentIndex.value = previewItems.value.indexOf(item)
    document.addEventListener('keyup', previewKeyboardListener)
  }

  const close = () => {
    document.removeEventListener('keyup', previewKeyboardListener)
    visible.value = false
  }

  return {
    visible,
    current,
    open,
    close,
    openPreviousImage,
    openNextImage,
  }
})

declare module 'hooks/store' {
  interface StoreProvider {
    preview: ReturnType<typeof usePreview>
  }
}
