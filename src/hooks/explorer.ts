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
  const { toast, confirm } = useToast()
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

  const deleteItems = () => {
    confirm.require({
      message: t('deleteAsk', [t('selectedItems').toLowerCase()]),
      header: 'Danger',
      icon: 'pi pi-info-circle',
      rejectProps: {
        label: t('cancel'),
        severity: 'secondary',
        outlined: true,
      },
      acceptProps: {
        label: t('delete'),
        severity: 'danger',
      },
      accept: () => {
        request(`/delete`, {
          method: 'DELETE',
          body: JSON.stringify({
            uri: currentPath.value,
            file_list: selectedItems.value.map((c) => c.fullname),
          }),
        }).then(() => {
          toast.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Deleted successfully.',
            life: 2000,
          })
          return refresh()
        })
      },
      reject: () => {},
    })
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

    item.onFocus = () => {
      const cancelEdit = ($event: KeyboardEvent) => {
        if ($event.key === 'Escape') {
          item.editName = undefined
          document.removeEventListener('keyup', cancelEdit)
        }
      }

      document.addEventListener('keyup', cancelEdit)
    }

    item.onBlur = ($event: MouseEvent) => {
      const name = item.editName?.trim() ?? ''

      const refocusEdit = () => {
        const target = $event.target as HTMLInputElement
        target.focus()
      }

      if (name === '') {
        item.editName = undefined
        return false
      }

      if (name.endsWith(' ') || name.endsWith('.')) {
        toast.add({
          severity: 'warn',
          summary: 'Warning',
          detail: 'Name cannot end with space or period.',
          life: 2000,
        })
        refocusEdit()
        return false
      }

      const windowsInvalidChars = /[<>:"/\\|?*]/
      const linuxInvalidChars = /[/\0]/

      if (windowsInvalidChars.test(name) || linuxInvalidChars.test(name)) {
        toast.add({
          severity: 'warn',
          summary: 'Warning',
          detail: 'Name contains illegal characters: <>:"/\\|?*',
          life: 2000,
        })
        refocusEdit()
        return false
      }

      const windowsReservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i
      if (windowsReservedNames.test(name.split('.')[0])) {
        toast.add({
          severity: 'warn',
          summary: 'Warning',
          detail: 'Name cannot be reserved name.',
          life: 2000,
        })
        refocusEdit()
        return false
      }

      const filename = `${currentPath.value}${name}`
      if (filename === item.fullname) {
        item.editName = undefined
        return false
      }
      request(item.fullname, {
        method: 'PUT',
        body: JSON.stringify({
          filename: filename,
        }),
      }).then(() => {
        item.name = name
        item.fullname = filename
        item.editName = undefined
      })
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

      contextMenu.push({
        label: t('rename'),
        icon: 'pi pi-file-edit',
        command: () => {
          item.editName = item.name
        },
      })

      contextMenu.push({
        label: t('delete'),
        icon: 'pi pi-trash',
        command: deleteItems,
      })

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

  const folderContext = ($event: MouseEvent) => {
    selectedItems.value = []
    const contextMenu: MenuItem[] = [
      {
        label: t('uploadFile'),
        icon: 'pi pi-upload',
        command: () => {
          const fileInput = document.createElement('input')
          fileInput.type = 'file'
          fileInput.multiple = true
          fileInput.accept = 'image/*'
          fileInput.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files
            if (!files) {
              return
            }
            const formData = new FormData()
            for (let i = 0; i < files.length; i++) {
              formData.append('files', files[i])
            }
            loading.value = true
            request(currentPath.value, {
              method: 'POST',
              body: formData,
            })
              .then(() => refresh())
              .catch((err) => {
                toast.add({
                  severity: 'error',
                  summary: 'Error',
                  detail: err.message || 'Failed to upload files.',
                  life: 5000,
                })
              })
              .finally(() => {
                loading.value = false
              })
          }
          fileInput.click()
        },
      },
    ]

    contextItems.value = contextMenu
    menuRef.value.show($event)
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

  const clearStatus = () => {
    selectedItems.value = []
    currentSelected.value = undefined
  }

  return {
    loading: loading,
    items: items,
    breadcrumb: breadcrumb,
    menuRef: menuRef,
    contextItems: contextItems,
    selectedItems: selectedItems,
    refresh: refresh,
    deleteItems: deleteItems,
    entryFolder: entryFolder,
    folderContext: folderContext,
    goBackParentFolder: goBackParentFolder,
    clearStatus: clearStatus,
  }
})

declare module 'hooks/store' {
  interface StoreProvider {
    explorer: ReturnType<typeof useExplorer>
  }
}
