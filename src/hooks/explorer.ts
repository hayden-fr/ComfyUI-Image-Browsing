import { request } from 'hooks/request'
import { defineStore } from 'hooks/store'
import { useToast } from 'hooks/toast'
import { MenuItem } from 'primevue/menuitem'
import { DirectoryItem, SelectOptions } from 'types/typings'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

interface DirectoryBreadcrumb extends DirectoryItem {
  children: SelectOptions[]
}

export const useExplorer = defineStore('explorer', (store) => {
  const { toast } = useToast()
  const { t } = useI18n()

  const loading = ref(false)

  const rootDirectory: DirectoryBreadcrumb = {
    name: 'output',
    type: 'folder',
    size: 0,
    fullname: '/output/',
    createdAt: 0,
    updatedAt: 0,
    children: [],
  }

  const breadcrumb = ref<DirectoryBreadcrumb[]>([rootDirectory])
  const currentPath = computed(() => {
    return breadcrumb.value[breadcrumb.value.length - 1].fullname
  })

  const items = ref<DirectoryItem[]>([])
  const menuRef = ref()
  const contextItems = ref<MenuItem[]>([])
  const selectedItems = ref<DirectoryItem[]>([])
  const currentSelected = ref<DirectoryItem>()

  const entryFolder = async (item: DirectoryItem, breadcrumbIndex: number) => {
    if (breadcrumbIndex === breadcrumb.value.length - 1) {
      const lastItem = breadcrumb.value[breadcrumbIndex]
      if (item.fullname === lastItem.fullname) {
        return
      }
    }

    breadcrumb.value.splice(breadcrumbIndex)
    breadcrumb.value.push({ ...item, children: [] })
    await refresh()
  }

  const goBackParentFolder = async () => {
    breadcrumb.value.pop()
    await refresh()
  }

  const bindEvents = (item: DirectoryItem, index: number) => {
    item.onClick = ($event) => {
      menuRef.value.hide($event)

      const isSelected = selectedItems.value.some((c) => c.name === item.name)

      if ($event.shiftKey) {
        const startIndex = Math.max(
          items.value.findIndex((c) => c.name === currentSelected.value?.name),
          0,
        )
        const endIndex = index
        const rangeItems = items.value.slice(
          Math.min(startIndex, endIndex),
          Math.max(startIndex, endIndex) + 1,
        )
        selectedItems.value = rangeItems
        return
      }

      currentSelected.value = item

      if ($event.ctrlKey) {
        selectedItems.value = isSelected
          ? selectedItems.value.filter((c) => c.name !== item.name)
          : [...selectedItems.value, item]
      } else {
        selectedItems.value = [item]
      }
    }

    item.onDbClick = () => {
      if (item.type === 'folder') {
        entryFolder(item, breadcrumb.value.length)
      } else {
        store.preview.open(item)
      }
    }

    item.onContextMenu = ($event) => {
      const isSelected = selectedItems.value.some((c) => c.name === item.name)

      if (!isSelected) {
        selectedItems.value = [item]
        currentSelected.value = item
      }

      const contextMenu: MenuItem[] = []

      if (item.type === 'folder') {
        contextMenu.push({
          label: t('open'),
          icon: 'pi pi-folder',
          command: () => {
            item.onDbClick?.($event)
          },
        })
      } else {
        contextMenu.push(
          {
            label: t('open'),
            icon: 'pi pi-image',
            command: () => {
              item.onDbClick?.($event)
            },
          },
          {
            label: t('openInNewTab'),
            icon: 'pi pi-external-link',
            command: () => {
              window.open(`/image-browsing${item.fullname}`, '_blank')
            },
          },
          {
            label: t('save'),
            icon: 'pi pi-save',
            command: () => {
              const link = document.createElement('a')
              link.href = `/image-browsing${item.fullname}`
              link.download = item.name
              link.click()
            },
          },
        )
      }

      if (selectedItems.value.length > 1 || item.type === 'folder') {
        contextMenu.push({
          label: t('download'),
          icon: 'pi pi-download',
          command: () => {
            loading.value = true
            request('/archive', {
              method: 'POST',
              body: JSON.stringify({
                uri: currentPath.value,
                file_list: selectedItems.value.map((c) => c.fullname),
              }),
            })
              .then((tmp_name) => {
                const link = document.createElement('a')
                link.href = `/image-browsing/archive/${tmp_name}`
                link.download = tmp_name
                link.click()
              })
              .catch((err) => {
                toast.add({
                  severity: 'error',
                  summary: 'Error',
                  detail: err.message || 'Failed to download.',
                  life: 15000,
                })
              })
              .finally(() => {
                loading.value = false
              })
          },
        })
      }

      contextItems.value = contextMenu
      menuRef.value.show($event)
    }
  }

  const refresh = async () => {
    loading.value = true
    items.value = []
    selectedItems.value = []
    currentSelected.value = undefined
    return request(currentPath.value)
      .then((resData) => {
        const folders: DirectoryItem[] = []
        const images: DirectoryItem[] = []
        for (const item of resData) {
          if (item.type === 'folder') {
            item.fullname = `${currentPath.value}${item.name}/`
            folders.push(item)
          } else {
            item.fullname = `${currentPath.value}${item.name}`
            images.push(item)
          }
        }
        items.value = [...folders, ...images]
        items.value.forEach(bindEvents)
        breadcrumb.value[breadcrumb.value.length - 1].children = folders.map(
          (item) => {
            const folderLevel = breadcrumb.value.length
            return {
              label: item.name,
              value: item.fullname,
              command: () => {
                entryFolder(item, folderLevel)
              },
            }
          },
        )
      })
      .catch((err) => {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: err.message || 'Failed to load folder list.',
          life: 15000,
        })
      })
      .finally(() => {
        loading.value = false
      })
  }

  return {
    loading: loading,
    items: items,
    breadcrumb: breadcrumb,
    menuRef: menuRef,
    contextItems: contextItems,
    selectedItems: selectedItems,
    refresh: refresh,
    entryFolder: entryFolder,
    goBackParentFolder: goBackParentFolder,
  }
})

declare module 'hooks/store' {
  interface StoreProvider {
    explorer: ReturnType<typeof useExplorer>
  }
}
