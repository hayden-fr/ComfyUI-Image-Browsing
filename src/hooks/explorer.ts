import { request } from 'hooks/request'
import { defineStore } from 'hooks/store'
import { useToast } from 'hooks/toast'
import { MenuItem } from 'primevue/menuitem'
import { app } from 'scripts/comfyAPI'
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
    fullname: '/output',
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

  const confirmName = ref<string | undefined>(undefined)

  const assertValidName = (name: string) => {
    if (items.value.some((c) => c.name == name)) {
      const message = 'Name was existed.'
      toast.add({
        severity: 'warn',
        summary: 'Warning',
        detail: message,
        life: 2000,
      })
      throw new Error(message)
    }

    if (name.endsWith(' ') || name.endsWith('.')) {
      const message = 'Name cannot end with space or period.'
      toast.add({
        severity: 'warn',
        summary: 'Warning',
        detail: message,
        life: 2000,
      })
      throw new Error(message)
    }

    const windowsInvalidChars = /[<>:"/\\|?*]/
    const linuxInvalidChars = /[/\0]/

    if (windowsInvalidChars.test(name) || linuxInvalidChars.test(name)) {
      const message = 'Name contains illegal characters: <>:"/\\|?*'
      toast.add({
        severity: 'warn',
        summary: 'Warning',
        detail: message,
        life: 2000,
      })
      throw new Error(message)
    }

    const windowsReservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i
    if (windowsReservedNames.test(name.split('.')[0])) {
      const message = 'Name cannot be reserved name.'
      toast.add({
        severity: 'warn',
        summary: 'Warning',
        detail: message,
        life: 2000,
      })
      throw new Error(message)
    }
  }

  const createItems = (formData: FormData) => {
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

  const deleteItems = () => {
    const handleDelete = () => {
      request(`/delete`, {
        method: 'DELETE',
        body: JSON.stringify({
          uri: currentPath.value,
          file_list: selectedItems.value.map((c) => c.fullname),
        }),
      })
        .then(() => {
          toast.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Deleted successfully.',
            life: 2000,
          })
          return refresh()
        })
        .catch((err) => {
          toast.add({
            severity: 'error',
            summary: 'Error',
            detail: err.message || 'Failed to load folder list.',
            life: 15000,
          })
        })
    }

    if (store.config.showDeleteConfirm.value) {
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
        accept: handleDelete,
        reject: () => {},
      })
    } else {
      handleDelete()
    }
  }

  const renameItem = (item: DirectoryItem) => {
    confirmName.value = item.name

    confirm.require({
      group: 'confirm-name',
      accept: () => {
        const name = confirmName.value?.trim() ?? ''
        const filename = `${currentPath.value}/${name}`

        // If name is empty or same as current name, do nothing
        if (name === '' || name === item.name) {
          return
        }

        assertValidName(name)

        request(item.fullname, {
          method: 'PUT',
          body: JSON.stringify({
            filename: filename,
          }),
        })
          .then(() => {
            item.name = name
            item.fullname = filename
          })
          .catch((err) => {
            toast.add({
              severity: 'error',
              summary: 'Error',
              detail: err.message || 'Failed to load folder list.',
              life: 5000,
            })
          })
      },
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
          renameItem(item)
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

    item.onDragEnd = ($event) => {
      const target = document.elementFromPoint($event.clientX, $event.clientY)

      if (
        target?.tagName.toLocaleLowerCase() === 'canvas' &&
        target.id === 'graph-canvas'
      ) {
        const imageSource = `/image-browsing${item.fullname}`
        fetch(imageSource)
          .then((response) => response.blob())
          .then((data) => {
            const type = data.type
            const file = new File([data], item.name, { type })
            app.handleFile(file)
          })
      }
    }
  }

  const folderContext = ($event: MouseEvent) => {
    selectedItems.value = []
    const contextMenu: MenuItem[] = [
      {
        label: t('addFolder'),
        icon: 'pi pi-folder-plus',
        command: () => {
          confirmName.value = t('newFolderName')

          confirm.require({
            group: 'confirm-name',
            accept: () => {
              const name = confirmName.value ?? ''
              assertValidName(name)
              const formData = new FormData()
              formData.append('folders', name)
              createItems(formData)
            },
          })
        },
      },
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
            createItems(formData)
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
          item.fullname = `${currentPath.value}/${item.name}`
          if (item.type === 'folder') {
            folders.push(item)
          } else {
            images.push(item)
          }
        }
        folders.sort((a, b) => a.name.localeCompare(b.name))
        images.sort((a, b) => a.name.localeCompare(b.name))
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
    confirmName: confirmName,
    refresh: refresh,
    deleteItems: deleteItems,
    renameItem: renameItem,
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
