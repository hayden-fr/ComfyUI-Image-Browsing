<template>
  <div
    class="flex h-full w-full flex-col"
    v-resize="onContainerResize"
    v-container="container"
    @contextmenu.prevent="nonContextMenu"
  >
    <div :class="['mb-4 flex gap-4 px-4', $xl('flex-row', 'flex-col')]">
      <div class="flex flex-1 gap-1 overflow-hidden">
        <Button
          class="shrink-0"
          icon="pi pi-arrow-up"
          :text="true"
          :rounded="true"
          severity="secondary"
          :disabled="breadcrumb.length < 2"
          @click="goBackParentFolder"
        ></Button>

        <Button
          class="shrink-0"
          icon="pi pi-refresh"
          :text="true"
          :rounded="true"
          severity="secondary"
          @click="refresh"
        ></Button>

        <div
          :class="[
            'flex h-10 flex-1 basis-10 items-center rounded-lg px-2 py-1',
            'bg-gray-100 dark:bg-gray-900',
            'overflow-hidden *:select-none *:opacity-70',
          ]"
        >
          <div class="flex h-full items-center">
            <span class="flex h-full items-center justify-center px-2">
              <i class="pi pi-desktop"></i>
            </span>
            <span class="flex aspect-square h-full items-center justify-center">
              <i class="pi pi-angle-right"></i>
            </span>
          </div>
          <div class="flex h-full items-center justify-end overflow-hidden">
            <div
              v-for="(item, index) in breadcrumb"
              :key="item.fullname"
              class="flex h-full items-center rounded border border-solid border-transparent hover:border-gray-400 dark:hover:border-gray-700"
            >
              <span
                class="flex h-full items-center whitespace-nowrap px-2 hover:bg-gray-400 dark:hover:bg-gray-700"
                @click="entryFolder(item, index)"
              >
                {{ item.name }}
              </span>
              <ResponseSelect
                v-if="item.children.length > 0"
                :model-value="item.fullname"
                :items="item.children"
              >
                <template #target="{ toggle, overlayVisible }">
                  <span
                    class="flex aspect-square h-full items-center justify-center hover:bg-gray-400 dark:hover:bg-gray-700"
                    @click="toggle"
                  >
                    <i
                      :class="[
                        'pi pi-angle-right transition-all',
                        overlayVisible ? '[transform:rotate(90deg)]' : '',
                      ]"
                    ></i>
                  </span>
                </template>
              </ResponseSelect>
            </div>
          </div>
        </div>
      </div>

      <ResponseInput
        v-model="searchContent"
        :placeholder="$t('searchInFolder', [currentFolderName])"
        :allow-clear="true"
      ></ResponseInput>
    </div>

    <div
      class="relative flex-1 select-none overflow-hidden"
      @click="clearSelected"
      @contextmenu.stop="folderContext"
    >
      <ResponseScroll :items="folderItems" :item-size="128" class="h-full">
        <template #item="{ item }">
          <div class="grid grid-cols-[repeat(auto-fit,8rem)] justify-center">
            <div
              v-for="rowItem in item"
              :key="rowItem.name"
              class="h-32 w-32 px-1 pb-1"
            >
              <div
                :class="[
                  'flex h-full w-full flex-col items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-lg',
                  'hover:bg-gray-300 dark:hover:bg-gray-800',
                  selectedItemsName.includes(rowItem.name)
                    ? 'bg-gray-300 dark:bg-gray-800'
                    : '',
                ]"
                @click.stop="rowItem.onClick"
                @dblclick.stop="rowItem.onDbClick"
                @contextmenu.stop="rowItem.onContextMenu"
              >
                <div class="relative h-24 w-24 overflow-hidden rounded-lg">
                  <div v-if="rowItem.type === 'folder'" class="h-full w-full">
                    <svg
                      t="1730360536641"
                      class="icon"
                      viewBox="0 0 1024 1024"
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      p-id="5617"
                      width="100%"
                      height="100%"
                    >
                      <path
                        d="M853.333333 256H469.333333l-85.333333-85.333333H170.666667c-46.933333 0-85.333333 38.4-85.333334 85.333333v170.666667h853.333334v-85.333334c0-46.933333-38.4-85.333333-85.333334-85.333333z"
                        fill="#FFA000"
                        p-id="5618"
                      ></path>
                      <path
                        d="M853.333333 256H170.666667c-46.933333 0-85.333333 38.4-85.333334 85.333333v426.666667c0 46.933333 38.4 85.333333 85.333334 85.333333h682.666666c46.933333 0 85.333333-38.4 85.333334-85.333333V341.333333c0-46.933333-38.4-85.333333-85.333334-85.333333z"
                        fill="#FFCA28"
                        p-id="5619"
                      ></path>
                    </svg>
                  </div>
                  <img
                    v-else-if="rowItem.type === 'image'"
                    class="h-full w-full object-contain"
                    :src="`/image-browsing${rowItem.fullname}?preview=true`"
                    alt="preview"
                  />
                  <div
                    class="absolute left-0 top-0 h-full w-full"
                    draggable="true"
                    @dragend.stop="rowItem.onDragEnd"
                  ></div>
                </div>
                <div class="flex w-full justify-center overflow-hidden px-1">
                  <span class="overflow-hidden text-ellipsis text-xs">
                    {{ rowItem.name }}
                  </span>
                </div>
              </div>
            </div>
            <div class="col-span-full"></div>
          </div>
        </template>

        <template #empty>
          <div></div>
        </template>
      </ResponseScroll>

      <div
        v-show="loading"
        class="absolute left-0 top-0 h-full w-full bg-black/10"
      >
        <div class="flex h-full w-full flex-col items-center justify-center">
          <div class="pi pi-spin pi-spinner"></div>
        </div>
      </div>

      <div
        v-show="!loading && folderItems.length === 0"
        class="absolute left-0 top-0 h-full w-full"
      >
        <div class="pt-20 text-center">No Data</div>
      </div>
    </div>

    <div class="flex select-none justify-between px-4 py-2 text-sm">
      <div class="flex gap-4">
        <span>{{ items.flat().length }} {{ $t('items') }}</span>
        <span v-show="selectedItems.length > 0">
          {{ $t('selected') }}
          {{ selectedItems.length }}
          {{ $t('items') }}
        </span>
      </div>
    </div>

    <ContextMenu ref="menu" :model="contextItems"></ContextMenu>

    <ConfirmDialog group="confirm-name">
      <template #container="{ acceptCallback: accept, rejectCallback: reject }">
        <div class="flex w-90 flex-col items-end rounded px-4 pb-4 pt-8">
          <InputText
            class="w-full"
            type="text"
            v-model="confirmName"
            v-focus
            @keyup.enter="accept"
          ></InputText>
          <div class="mt-6 flex items-center gap-2">
            <Button :label="$t('cancel')" @click="reject" outlined></Button>
            <Button :label="$t('confirm')" @click="accept"></Button>
          </div>
        </div>
      </template>
    </ConfirmDialog>
  </div>
</template>

<script setup lang="ts">
import ResponseInput from 'components/ResponseInput.vue'
import ResponseScroll from 'components/ResponseScroll.vue'
import ResponseSelect from 'components/ResponseSelect.vue'
import { useContainerQueries } from 'hooks/container'
import { useExplorer } from 'hooks/explorer'
import { defineResizeCallback } from 'hooks/resize'
import { chunk } from 'lodash'
import Button from 'primevue/button'
import ConfirmDialog from 'primevue/confirmdialog'
import ContextMenu from 'primevue/contextmenu'
import InputText from 'primevue/inputtext'
import { computed, ref } from 'vue'

const {
  loading,
  breadcrumb,
  items,
  selectedItems,
  menuRef: menu,
  contextItems,
  confirmName,
  refresh,
  entryFolder,
  folderContext,
  goBackParentFolder,
} = useExplorer()

const searchContent = ref('')

const colSpan = ref(1)

const folderItems = computed(() => {
  const filterItems = items.value.filter((item) => {
    return item.name.toLowerCase().includes(searchContent.value.toLowerCase())
  })

  return chunk(filterItems, colSpan.value)
})

const onContainerResize = defineResizeCallback((entries) => {
  const entry = entries[0]

  const containerWidth = entry.contentRect.width
  const itemWidth = 128
  colSpan.value = Math.floor(containerWidth / itemWidth)
})

const currentFolderName = computed(() => {
  return breadcrumb.value[breadcrumb.value.length - 1].name
})

const selectedItemsName = computed(() => {
  return selectedItems.value.map((item) => item.name)
})

const nonContextMenu = ($event: MouseEvent) => {
  menu.value.hide($event)
}

const clearSelected = () => {
  selectedItems.value = []
}

const vFocus = {
  mounted: (el: HTMLInputElement) => el.focus(),
}

const container = Symbol('container')

const { $xl } = useContainerQueries(container)
</script>
