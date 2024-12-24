import { defineStore } from 'hooks/store'
import { DirectoryItem } from 'types/typings'
import { ref } from 'vue'

export const usePreview = defineStore('preview', () => {
  const visible = ref(false)
  const current = ref<DirectoryItem>()

  const open = (item: DirectoryItem) => {
    visible.value = true
    current.value = item
  }

  const close = () => {
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
