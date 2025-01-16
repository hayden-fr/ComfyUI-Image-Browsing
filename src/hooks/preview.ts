import { defineStore } from 'hooks/store'
import { DirectoryItem } from 'types/typings'
import { computed, ref } from 'vue'

export const usePreview = defineStore('preview', (store) => {
  const visible = ref(false)
  const current = ref<DirectoryItem>()
  const currentIndex = ref(0)

  const imageItems = computed(() => {
    return store.explorer.items.value.filter((item) => {
      return item.type === 'image'
    })
  })

  const openPreviousImage = () => {
    currentIndex.value--
    if (currentIndex.value < 0) {
      currentIndex.value = imageItems.value.length - 1
    }
    const item = imageItems.value[currentIndex.value]
    current.value = item
  }

  const openNextImage = () => {
    currentIndex.value++
    if (currentIndex.value > imageItems.value.length - 1) {
      currentIndex.value = 0
    }
    const item = imageItems.value[currentIndex.value]
    current.value = item
  }

  const previewKeyboardListener = (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft') {
      openPreviousImage()
    }
    if (event.key === 'ArrowRight') {
      openNextImage()
    }
  }

  const open = (item: DirectoryItem) => {
    visible.value = true
    current.value = item
    currentIndex.value = imageItems.value.indexOf(item)
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
  }
})

declare module 'hooks/store' {
  interface StoreProvider {
    preview: ReturnType<typeof usePreview>
  }
}
