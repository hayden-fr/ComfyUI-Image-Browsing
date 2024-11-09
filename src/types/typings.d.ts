export type ContainerSize = { width: number; height: number }
export type ContainerPosition = { left: number; top: number }

export interface DirectoryItem {
  name: string
  type: 'folder' | 'image'
  size: number
  fullname: string
  createdAt: number
  updatedAt: number
}

export interface SelectOptions {
  label: string
  value: any
  icon?: string
  command: () => void
}
