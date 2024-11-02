<template>
  <GlobalToast></GlobalToast>
  <GlobalConfirm></GlobalConfirm>
  <GlobalLoading></GlobalLoading>
  <GlobalDialogStack></GlobalDialogStack>
</template>

<script setup lang="ts">
import DialogExplorer from 'components/DialogExplorer.vue'
import GlobalToast from 'components/GlobalToast.vue'
import GlobalLoading from 'components/GlobalLoading.vue'
import GlobalDialogStack from 'components/GlobalDialogStack.vue'
import GlobalConfirm from 'primevue/confirmdialog'
import { $el, app, ComfyButton } from 'scripts/comfyAPI'
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStoreProvider } from 'hooks/store'

const { t } = useI18n()
const { dialog, explorer } = useStoreProvider()

onMounted(() => {
  const openExplorerDialog = () => {
    explorer.refresh()

    dialog.open({
      key: 'output-explorer',
      title: t('outputExplorer'),
      content: DialogExplorer,
      keepAlive: true,
    })
  }

  app.ui?.menuContainer?.appendChild(
    $el('button', {
      id: 'comfyui-image-browsing-button',
      textContent: t('outputExplorer'),
      onclick: openExplorerDialog,
    }),
  )

  app.menu?.settingsGroup.append(
    new ComfyButton({
      icon: 'folder-search',
      tooltip: t('openOutputExplorer'),
      content: t('outputExplorer'),
      action: openExplorerDialog,
    }),
  )
})
</script>
