type ContainerSize = { width: number; height: number }
type ContainerPosition = { left: number; top: number }

interface DirectoryItem {
  name: string
  type: 'folder' | 'image'
  size: number
  fullname: string
  createdAt: number
  updatedAt: number
}

interface SelectOptions {
  label: string
  value: any
  icon?: string
  command: () => void
}
