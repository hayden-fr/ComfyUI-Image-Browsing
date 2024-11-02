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

  useAddConfigSettings(config)

  return config
})

type Config = ReturnType<typeof useConfig>

declare module 'hooks/store' {
  interface StoreProvider {
    config: Config
  }
}

function useAddConfigSettings(config: Config) {
  onMounted(() => {
    // // API keys
    // app.ui?.settings.addSetting({
    //   id: 'ModelManager.APIKey.HuggingFace',
    //   name: 'HuggingFace API Key',
    //   type: 'text',
    //   defaultValue: undefined,
    // })
    // app.ui?.settings.addSetting({
    //   id: 'ModelManager.APIKey.Civitai',
    //   name: 'Civitai API Key',
    //   type: 'text',
    //   defaultValue: undefined,
    // })
  })
}
