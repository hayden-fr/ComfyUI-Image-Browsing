import { defineStore } from 'hooks/store'
import { onMounted, onUnmounted, ref } from 'vue'

export const useConfig = defineStore('config', () => {
  const mobileDeviceBreakPoint = 759
  const isMobile = ref(window.innerWidth < mobileDeviceBreakPoint)

  const checkDeviceType = () => {
    isMobile.value = window.innerWidth < mobileDeviceBreakPoint
  }

  onMounted(() => {
    window.addEventListener('resize', checkDeviceType)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', checkDeviceType)
  })

  const config = {
    isMobile,
  }

  return config
})

type Config = ReturnType<typeof useConfig>

declare module 'hooks/store' {
  interface StoreProvider {
    config: Config
  }
}
