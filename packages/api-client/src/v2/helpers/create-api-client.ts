import type { HttpMethod } from '@scalar/helpers/http/http-methods'
import type { WorkspaceStore } from '@scalar/workspace-store/client'
import { type Component, createApp } from 'vue'
import type { Router } from 'vue-router'

import type { ClientLayout } from '@/hooks/useLayout'
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
  store,
  mountOnInitialize = true,
  router,
}: CreateApiClientParams) => {
  // Create the plugin manager
  const pluginManager = createPluginManager({
    plugins: configuration.value.plugins ?? [],
  })

  const app = createApp(appComponent)
  app.use(router)
  // Provide the plugin manager
  app.provide(PLUGIN_MANAGER_SYMBOL, pluginManager)
  // Set an id prefix for useId so we don't have collisions with other Vue apps
  app.config.idPrefix = 'scalar-client'

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

  return {
    /** The vue app instance for the modal, be careful with this */
    // app,
    /** Route to the specified method and path */
    route: () => {},
    /** Mount the references to a given element */
    mount,
    /* The workspace store */
    store,
  }
}
