import type { HttpMethod } from '@scalar/helpers/http/http-methods'
import { LS_KEYS } from '@scalar/helpers/object/local-storage'
import { type Workspace, workspaceSchema } from '@scalar/oas-utils/entities/workspace'
import { DATA_VERSION, DATA_VERSION_LS_LEY } from '@scalar/oas-utils/migrations'
import type { ApiClientConfiguration } from '@scalar/types/api-reference'
import type { WorkspaceStore } from '@scalar/workspace-store/client'
import { type Component, createApp } from 'vue'
import type { Router } from 'vue-router'

import { CLIENT_CONFIGURATION_SYMBOL } from '@/hooks/useClientConfig'
import { type ClientLayout, LAYOUT_SYMBOL } from '@/hooks/useLayout'
import { SIDEBAR_SYMBOL, createSidebarState } from '@/hooks/useSidebar'
import { PLUGIN_MANAGER_SYMBOL, createPluginManager } from '@/plugins'

/** Payload for the client.open method */
export type OpenClientPayload = {
  /** The path of the request */
  path: string
  /** The method of the request */
  method: HttpMethod
  /** The name of the example */
  exampleName?: string
  _source?: 'api-reference' | 'gitbook'
}

export type CreateApiClientParams = {
  /** Element to mount the references to */
  el: HTMLElement | null
  /** Main vue app component to create the vue app */
  appComponent: Component
  /** Read only version of the client app */
  isReadOnly?: boolean
  /** Persist the workspace to indexDB */
  persistData?: boolean
  /**
   * Will attempt to mount the references immediately
   * For SSR this may need to be blocked and done client side
   */
  mountOnInitialize?: boolean
  /** Instance of a vue router */
  router: Router
  /** In case the store has been instantiated beforehand */
  store?: WorkspaceStore
  /**
   * The layout of the client
   * @see {@link ClientLayout}
   */
  layout?: ClientLayout
}

/**
 * Sync method to create the api client vue app and store
 *
 * This method will NOT import the spec, just create the modal so you must use update/updateConfig before opening
 */
export const createApiClient = ({
  el,
  appComponent,
  isReadOnly = false,
  store: _store,
  persistData = true,
  mountOnInitialize = true,
  layout = 'desktop',
  router,
}: CreateApiClientParams) => {
  // Create the store if it wasn't passed in
  const store =
    _store ||
    createWorkspaceStore({
      proxyUrl: configuration.value.proxyUrl,
      theme: configuration.value.theme,
      showSidebar: configuration.value.showSidebar ?? true,
      hideClientButton: configuration.value.hideClientButton ?? false,
      _integration: configuration.value._integration,
      useLocalStorage: persistData,
    })

  // Create the plugin manager
  const pluginManager = createPluginManager({
    plugins: configuration.value.plugins ?? [],
  })

  // Safely check for localStorage availability
  const hasLocalStorage = () => {
    try {
      return typeof window !== 'undefined' && window.localStorage !== undefined
    } catch {
      return false
    }
  }

  // Load from localStorage if available and enabled
  if (hasLocalStorage() && localStorage.getItem(LS_KEYS.WORKSPACE) && !isReadOnly) {
    try {
      const size: Record<string, string> = {}
      let _lsTotal = 0
      let _xLen = 0
      let _key = ''

      for (_key in localStorage) {
        if (!Object.hasOwn(localStorage, _key)) {
          continue
        }
        _xLen = (localStorage[_key].length + _key.length) * 2
        _lsTotal += _xLen
        size[_key] = (_xLen / 1024).toFixed(2) + ' KB'
      }
      size['Total'] = (_lsTotal / 1024).toFixed(2) + ' KB'
      console.table(size)

      loadAllResources(store)
    } catch (error) {
      console.warn('Failed to load from localStorage:', error)
    }
  }
  // Create the default store
  else if (!isReadOnly && !configuration.value.url && !configuration.value.content) {
    // Create default workspace
    store.workspaceMutators.add({
      uid: 'default' as Workspace['uid'],
      name: 'Workspace',
      proxyUrl: configuration.value.proxyUrl,
    })

    if (hasLocalStorage()) {
      try {
        localStorage.setItem(DATA_VERSION_LS_LEY, DATA_VERSION)
      } catch (error) {
        console.warn('Failed to set localStorage version:', error)
      }
    }
  }
  // Add a barebones workspace if we want to load a spec in the modal
  else {
    const workspace = workspaceSchema.parse({
      uid: 'default',
      name: 'Workspace',
      proxyUrl: configuration.value.proxyUrl,
    })
    store.workspaceMutators.rawAdd(workspace)
  }

  const app = createApp(appComponent)
  app.use(router)
  // Provide the workspace store for the useWorkspace hook
  app.provide(WORKSPACE_SYMBOL, store)
  // Provide the layout for the useLayout hook
  app.provide(LAYOUT_SYMBOL, layout)
  // Provide the active entities store
  app.provide(ACTIVE_ENTITIES_SYMBOL, activeEntities)
  // Provide the sidebar state
  app.provide(SIDEBAR_SYMBOL, sidebarState)
  // Provide the client config
  app.provide(CLIENT_CONFIGURATION_SYMBOL, configuration)
  // Provide the plugin manager
  app.provide(PLUGIN_MANAGER_SYMBOL, pluginManager)
  // Set an id prefix for useId so we don't have collisions with other Vue apps
  app.config.idPrefix = 'scalar-client'

  const {
    collectionMutators,
    importSpecFile,
    importSpecFromUrl,
    modalState,
    requests,
    securitySchemes,
    securitySchemeMutators,
    servers,
    workspaceMutators,
    requestExampleMutators,
  } = store
  const { activeCollection, activeWorkspace } = activeEntities

  // Mount the vue app
  const mount = (mountingEl = el) => {
    if (!mountingEl) {
      console.error(
        '[@scalar/api-client-modal] Could not create the API client.',
        'Invalid HTML element provided.',
        'Read more: https://github.com/scalar/scalar/tree/main/packages/api-client',
      )

      return
    }
    app.mount(mountingEl)
  }
  if (mountOnInitialize) {
    mount()
  }

  /** Route to the specified method and path */
  const route = (payload?: OpenClientPayload) => {
    // Find the request from path + method
    const resolvedRequestUid = getRequestUidByPathMethod(requests, payload)

    // Redirect to the request
    if (resolvedRequestUid) {
      router.push({
        name: 'request',
        query: payload?._source ? { source: payload._source } : {},
        params: {
          workspace: 'default',
          request: resolvedRequestUid,
        },
      })
    } else {
      console.warn('[@scalar/api-client] Could not find request for path and method', payload)
    }
  }

  return {
    /** The vue app instance for the modal, be careful with this */
    app,
    resetStore,
    /**
     * Update the API client config
     *
     * Deletes the current store before importing again for now, in the future will Diff and only update what is needed
     */
    updateConfig: async (_newConfig: Partial<ApiClientConfiguration>) => {},
    /** Route to a method + path */
    route,
    /** Open the API client modal and optionally route to a request */
    open: (payload?: OpenClientPayload) => {},
    /** Mount the references to a given element */
    mount,
    /** State for controlling the modal */
    modalState,
    /* The workspace store */
    store,
    /** Update the currently selected example */
    updateExample: (exampleKey: string, operationId: string) => {},
  }
}
