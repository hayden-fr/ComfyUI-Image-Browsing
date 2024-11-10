<template>
  <div
    class="flex h-full w-full flex-col gap-4 @container"
    v-resize="onContainerResize"
  >
    <div class="flex flex-col gap-4 px-4 @xl:flex-row">
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
            'flex h-10 flex-1 basis-10 items-center gap-1 rounded-lg px-4 py-1',
            'bg-gray-100 dark:bg-gray-900',
            'overflow-hidden *:select-none *:opacity-70',
          ]"
        >
          <div class="flex h-full items-center gap-1">
            <span class="h-4 w-4">
              <i class="pi pi-desktop"></i>
            </span>
            <span class="h-4 w-4">
              <i class="pi pi-angle-right"></i>
            </span>
          </div>
          <div
            class="flex h-full items-center justify-end gap-1 overflow-hidden"
          >
            <div
              v-for="(item, index) in breadcrumb"
              :key="item.fullname"
              class="flex h-full items-center gap-1 rounded hover:bg-gray-300 dark:hover:bg-gray-800"
            >
              <span
                class="flex h-full items-center whitespace-nowrap px-1"
                @click="entryFolder(item, index)"
              >
                {{ item.name }}
              </span>
              <ResponseSelect
                v-if="item.children.length > 0"
                :model-value="item.fullname"
                :items="item.children"
              >
                <template #target="{ toggle }">
                  <span
                    class="flex h-full w-4 items-center border-0 border-l-2 border-solid border-gray-100 dark:border-gray-900"
                    @click="toggle"
                  >
                    <i class="pi pi-angle-right"></i>
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

    <div class="relative flex-1 select-none overflow-hidden">
      <ResponseScroll :items="folderItems" :item-size="128" class="h-full">
        <template #item="{ item }">
          <div class="grid grid-cols-[repeat(auto-fit,8rem)] justify-center">
            <div
              v-for="rowItem in item"
              :key="rowItem.name"
              class="flex h-32 w-32 flex-col items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700"
            >
              <div class="h-24 w-24 overflow-hidden rounded-lg">
                <div
                  v-if="rowItem.type === 'folder'"
                  class="h-full w-full"
                  @dblclick.stop="entryFolder(rowItem, breadcrumb.length)"
                  @touchstart.stop="entryFolder(rowItem, breadcrumb.length)"
                >
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
                <a
                  v-else-if="rowItem.type === 'image'"
                  :href="`/image-browsing${rowItem.fullname}`"
                  target="_blank"
                >
                  <img
                    class="h-full w-full object-contain"
                    :src="`/image-browsing${rowItem.fullname}?preview=true`"
                  />
                </a>
              </div>
              <div class="flex w-full justify-center overflow-hidden px-1">
                <span class="overflow-hidden text-ellipsis text-xs">
                  {{ rowItem.name }}
                </span>
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
        class="absolute left-0 top-0 h-full w-full bg-white opacity-70"
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
  </div>
</template>

<script setup lang="ts">
import ResponseInput from 'components/ResponseInput.vue'
import ResponseScroll from 'components/ResponseScroll.vue'
import ResponseSelect from 'components/ResponseSelect.vue'
import { useExplorer } from 'hooks/explorer'
import { defineResizeCallback } from 'hooks/resize'
import { chunk } from 'lodash'
import Button from 'primevue/button'
import { computed, ref } from 'vue'

const { loading, breadcrumb, items, refresh, entryFolder, goBackParentFolder } =
  useExplorer()

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
</script>
