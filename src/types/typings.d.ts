export type ContainerSize = { width: number; height: number }
export type ContainerPosition = { left: number; top: number }

export interface DirectoryItem {
  name: string
  type: 'folder' | 'image'
  size: number
  fullname: string
  createdAt: number
  updatedAt: number
  editName?: string
  onClick?: ($event: MouseEvent) => void
  onDbClick?: ($event: MouseEvent) => void
  onContextMenu?: ($event: MouseEvent) => void
  onFocus?: ($event: MouseEvent) => void
  onBlur?: ($event: MouseEvent) => void
}

export interface SelectOptions {
  label: string
  value: any
  icon?: string
  command: () => void
}
