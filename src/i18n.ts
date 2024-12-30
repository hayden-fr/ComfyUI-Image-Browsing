import { createI18n } from 'vue-i18n'

const messages = {
  en: {
    outputExplorer: 'Output Explorer',
    openOutputExplorer: 'Open Output Explorer',
    searchInFolder: 'Search in {0}',
    open: 'View',
    openInNewTab: 'View in new tab',
    save: 'Save',
    rename: 'Rename',
    download: 'Archive & Download',
    delete: 'Delete',
    deleteAsk: 'Confirm delete {0}?',
    selectedItems: 'Selected Items',
    addFolder: 'Add folder',
    uploadFile: 'Upload file',
    newFolderName: 'New Folder',
    selected: 'Selected',
    items: 'Items',
    cancel: 'Cancel',
    confirm: 'Confirm',
    setting: {
      showDeleteConfirm: 'Show delete confirmation dialog',
    },
  },
  zh: {
    outputExplorer: '输出浏览器',
    openOutputExplorer: '打开输出浏览器',
    searchInFolder: '在 {0} 中搜索',
    open: '打开',
    openInNewTab: '在新标签页中打开',
    save: '保存',
    rename: '重命名',
    download: '打包并下载',
    delete: '删除',
    deleteAsk: '确认删除{0}?',
    selectedItems: '已选项目',
    addFolder: '新增文件夹',
    uploadFile: '上传文件',
    newFolderName: '新建文件夹',
    selected: '已选',
    items: '个项目',
    cancel: '取消',
    confirm: '确认',
    setting: {
      showDeleteConfirm: '显示删除确认对话框',
    },
  },
}

const getLocalLanguage = () => {
  const local =
    localStorage.getItem('Comfy.Settings.Comfy.Locale') ||
    navigator.language.split('-')[0] ||
    'en'

  return local.replace(/['"]/g, '')
}

export const i18n = createI18n({
  legacy: false,
  locale: getLocalLanguage(),
  fallbackLocale: 'en',
  messages,
})
