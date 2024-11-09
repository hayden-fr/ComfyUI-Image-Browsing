import { request } from 'hooks/request'
import { defineStore } from 'hooks/store'
import { useToast } from 'hooks/toast'
import { DirectoryItem, SelectOptions } from 'types/typings'
import { computed, ref } from 'vue'

interface DirectoryBreadcrumb extends DirectoryItem {
  children: SelectOptions[]
}

export const useExplorer = defineStore('explorer', () => {
  const { toast } = useToast()

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

  const refresh = async () => {
    loading.value = true
    items.value = []
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
