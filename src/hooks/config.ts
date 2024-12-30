import { defineStore } from 'hooks/store'
import { app } from 'scripts/comfyAPI'
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const useAddConfigSettings = (config: Config) => {
  const { t } = useI18n()

  onMounted(() => {
    app.ui?.settings.addSetting({
      id: 'ImageBrowsing.Delete.Confirm',
      category: [t('outputExplorer'), t('delete')],
      name: t('setting.showDeleteConfirm'),
      type: 'boolean',
      defaultValue: true,
      onChange: (value) => {
        config.showDeleteConfirm.value = value
      },
    })
  })
}

export const useConfig = defineStore('config', () => {
  const mobileDeviceBreakPoint = 759
  const isMobile = ref(window.innerWidth < mobileDeviceBreakPoint)
  const showDeleteConfirm = ref(
    app.ui?.settings.getSettingValue('ImageBrowsing.Delete.Confirm') ?? true,
  )

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
    showDeleteConfirm,
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
