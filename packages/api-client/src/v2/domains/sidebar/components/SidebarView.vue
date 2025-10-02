<script lang="ts">
/**
 * Contains the layout with the sidebar for operation and collection pages
 */
export default {}
</script>
<script setup lang="ts">
import { reactive, ref } from 'vue'
import { RouterView } from 'vue-router'

import SidebarToggle from '@/components/Sidebar/SidebarToggle.vue'
import { useOpenApiWatcher } from '@/views/Request/hooks/useOpenApiWatcher'

const props = defineProps<{
  test: number
}>()

defineEmits<(e: 'newTab', item: { name: string; uid: string }) => void>()

console.log(props)

useOpenApiWatcher()

/** Tracks which folders are open  */
const openSidebarFolders = reactive<Record<string, boolean>>({})

/** Tracks if the sidebar is open */
const isSidebarOpen = ref(false)
// const isSidebarOpen = ref(false layout !== 'modal')

/** Actions */
// setCollapsedSidebarFolder,
// toggleSidebarFolder,
// setSidebarOpen,
// toggleSidebarOpen,
</script>

<template>
  <!-- Layout -->
  <div
    ref="element"
    class="bg-b-1 relative z-0 flex h-full flex-1 flex-col overflow-hidden pt-0"
    :class="{
      '!mr-0 !mb-0 !border-0': layout === 'modal',
    }">
    <SidebarToggle
      v-if="showSidebar"
      v-model="isSidebarOpen"
      class="absolute top-2 left-3 z-50"
      :class="[
        { hidden: isSidebarOpen },
        { 'xl:!flex': !isSidebarOpen },
        { '!flex': layout === 'modal' },
      ]" />
    <div class="flex h-full">
      <!-- Sidebar -->
      <div class="sidebar-active-width">Insert sidebar block here</div>

      <!-- Content -->
      <div class="flex h-full flex-1 flex-col">
        <!-- <RouterView /> -->
      </div>
    </div>
  </div>
</template>

<style scoped>
.request-text-color-text {
  color: var(--scalar-color-1);
  background: linear-gradient(
    var(--scalar-background-1),
    var(--scalar-background-3)
  );
  box-shadow: 0 0 0 1px var(--scalar-border-color);
}
@media screen and (max-width: 800px) {
  .sidebar-active-hide-layout {
    display: none;
  }
  .sidebar-active-width {
    width: 100%;
  }
}
</style>
