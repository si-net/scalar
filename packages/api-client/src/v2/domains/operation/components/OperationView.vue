<script lang="ts">
/**
 * The operation view which loads a single operation
 */
export default {}
</script>
<script setup lang="ts">
import type { SelectedSecuritySchemeUids } from '@scalar/oas-utils/entities/shared'
import { computed } from 'vue'

import EmptyState from '@/components/EmptyState.vue'
import ViewLayout from '@/components/ViewLayout/ViewLayout.vue'
import ViewLayoutContent from '@/components/ViewLayout/ViewLayoutContent.vue'
import { useLayout } from '@/hooks'
import { useSidebar } from '@/hooks/useSidebar'
import { importCurlCommand } from '@/libs/importers/curl'
import type { SendRequestResult } from '@/libs/send-request/create-request-operation'
import { useWorkspace } from '@/store'
import { useActiveEntities } from '@/store/active-entities'
import RequestSection from '@/views/Request/RequestSection/RequestSection.vue'
import RequestSubpageHeader from '@/views/Request/RequestSubpageHeader.vue'
import ResponseSection from '@/views/Request/ResponseSection/ResponseSection.vue'

const { invalidParams, selectedSecuritySchemeUids, requestResult } =
  defineProps<{
    invalidParams: Set<string>
    selectedSecuritySchemeUids: SelectedSecuritySchemeUids
    requestResult?: SendRequestResult | null
  }>()
defineEmits<(e: 'newTab', item: { name: string; uid: string }) => void>()

const { events } = useWorkspace()
const { isSidebarOpen } = useSidebar()
const workspaceContext = useWorkspace()
const { layout } = useLayout()

const {
  activeCollection,
  activeExample,
  activeRequest,
  activeWorkspace,
  activeServer,
  activeEnvVariables,
  activeEnvironment,
  activeWorkspaceRequests,
} = useActiveEntities()
const { modalState, requestHistory } = workspaceContext

const activeHistoryEntry = computed(() =>
  [...requestHistory]
    .reverse()
    .find((r) => r.request.uid === activeExample.value?.uid),
)

function handleCurlImport(curl: string) {
  events.commandPalette.emit({
    commandName: 'Import from cURL',
    metaData: {
      parsedCurl: importCurlCommand(curl),
      collectionUid: activeCollection.value?.uid,
    },
  })
}

const pluginManager = usePluginManager()

const element = ref<HTMLDivElement>()

const requestAbortController = ref<AbortController>()
const invalidParams = ref<Set<string>>(new Set())
const requestResult = ref<SendRequestResult | null>(null)

/**
 * Selected scheme UIDs
 *
 * In the modal we use collection.selectedSecuritySchemes and in the
 * standalone client we use request.selectedSecuritySchemeUids
 *
 * These are centralized here so they can be drilled down AND used in send-request
 */
const selectedSecuritySchemeUids = computed(
  () =>
    (activeCollection.value?.useCollectionSecurity
      ? activeCollection.value?.selectedSecuritySchemeUids
      : activeRequest.value?.selectedSecuritySchemeUids) ?? [],
)

/**
 * Execute the request
 * called from the send button as well as keyboard shortcuts
 */
const executeRequest = async () => {
  if (!activeRequest.value || !activeExample.value || !activeCollection.value) {
    return
  }

  invalidParams.value = validateParameters(activeExample.value)

  const environmentValue =
    typeof activeEnvironment.value === 'object'
      ? activeEnvironment.value.value
      : '{}'
  const e = safeJSON.parse(environmentValue)
  if (e.error) {
    console.error('INVALID ENVIRONMENT!')
  }
  const environment =
    e.error || typeof e.data !== 'object' ? {} : (e.data ?? {})

  const globalCookies =
    activeWorkspace.value?.cookies.map((c) => cookies[c]).filter(isDefined) ??
    []

  const server =
    activeCollection.value?.info?.title === 'Drafts'
      ? undefined
      : activeServer.value

  const [error, requestOperation] = createRequestOperation({
    request: activeRequest.value,
    example: activeExample.value,
    selectedSecuritySchemeUids: selectedSecuritySchemeUids.value,
    proxyUrl: activeWorkspace.value?.proxyUrl ?? '',
    environment,
    globalCookies,
    status: events.requestStatus,
    securitySchemes: securitySchemes,
    server,
    pluginManager,
  })

  // Call the onRequestSent callback if it exists
  config.value?.onRequestSent?.(activeRequest.value.path ?? '')

  // Error from createRequestOperation
  if (error) {
    toast(error.message, 'error')
    return
  }

  requestAbortController.value = requestOperation.controller
  const [sendRequestError, result] = await requestOperation.sendRequest()

  // Store the result to share it with child components
  requestResult.value = result

  // Send error toast
  if (sendRequestError) {
    toast(sendRequestError.message, 'error')
  } else {
    // We need to deep clone the result because it's a ref and updates will break the history
    requestHistory.push(cloneRequestResult(result))
  }
}

/** Cancel a live request */
const cancelRequest = async () =>
  requestAbortController.value?.abort(ERRORS.REQUEST_ABORTED)

/** Subscribed to executeRequest, used for logging / analytics. */
function logRequest() {
  analytics?.capture('client-send-request')
}

onMounted(() => {
  events.executeRequest.on(executeRequest)
  events.executeRequest.on(logRequest)
  events.cancelRequest.on(cancelRequest)
})

/**
 * Need to manually remove listener on unmount due to vueuse memory leak
 *
 * @see https://github.com/vueuse/vueuse/issues/3498#issuecomment-2055546566
 */
onBeforeUnmount(() => {
  events.executeRequest.off(executeRequest)
  events.executeRequest.off(logRequest)
})

// Clear invalid params on parameter update
watch(
  () => activeExample.value?.parameters,
  () => {
    invalidParams.value.clear()
  },
  { deep: true },
)

const cloneRequestResult = (result: any) => {
  // Create a structured clone that can handle Blobs, ArrayBuffers, etc.
  try {
    return structuredClone(result)
  } catch (error) {
    // Fallback to a custom cloning approach if structuredClone fails
    // or isn't available in the environment
    const clone = { ...result }

    // Handle response data specifically
    if (result.response?.data) {
      // If it's a Blob/File/ArrayBuffer, store a reference
      if (
        result.response.data instanceof Blob ||
        result.response.data instanceof ArrayBuffer
      ) {
        clone.response.data = result.response.data
      } else {
        // For regular objects, do a deep clone
        clone.response.data = JSON.parse(JSON.stringify(result.response.data))
      }
    }

    return clone
  }
}
</script>

<template>
  <div
    v-if="activeCollection && activeWorkspace"
    class="bg-b-1 relative z-0 flex h-full flex-1 flex-col overflow-hidden pt-0"
    :class="{
      '!mr-0 !mb-0 !border-0': layout === 'modal',
    }">
    <div class="flex h-full">
      <!-- Ensure we have a request for this view -->
      <div
        v-if="activeRequest"
        class="flex h-full flex-1 flex-col">
        <RequestSubpageHeader
          v-model="isSidebarOpen"
          :collection="activeCollection"
          :envVariables="activeEnvVariables"
          :environment="activeEnvironment"
          :operation="activeRequest"
          :server="activeServer"
          :workspace="activeWorkspace"
          @hideModal="() => modalState.hide()"
          @importCurl="handleCurlImport" />
        <ViewLayout>
          <!-- TODO possible loading state -->
          <ViewLayoutContent
            v-if="activeExample"
            class="flex-1"
            :class="[isSidebarOpen ? 'sidebar-active-hide-layout' : '']">
            <RequestSection
              :collection="activeCollection"
              :envVariables="activeEnvVariables"
              :environment="activeEnvironment"
              :example="activeExample"
              :invalidParams="invalidParams"
              :operation="activeRequest"
              :selectedSecuritySchemeUids="selectedSecuritySchemeUids"
              :server="activeServer"
              :workspace="activeWorkspace" />
            <ResponseSection
              :collection="activeCollection"
              :numWorkspaceRequests="activeWorkspaceRequests.length"
              :operation="activeRequest"
              :requestResult="requestResult"
              :response="activeHistoryEntry?.response"
              :workspace="activeWorkspace" />
          </ViewLayoutContent>
        </ViewLayout>
      </div>

      <!-- No active request -->
      <EmptyState v-else />
    </div>
  </div>

  <!-- No Collection or Workspace -->
  <EmptyState v-else />
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
