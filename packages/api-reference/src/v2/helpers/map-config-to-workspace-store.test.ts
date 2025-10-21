import type { ApiReferenceConfiguration } from '@scalar/types/api-reference'
import type { WorkspaceStore } from '@scalar/workspace-store/client'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { mapConfigToWorkspaceStore } from './map-config-to-workspace-store'

describe('mapConfigToWorkspaceStore', () => {
  it('triggers updateDocument with correct payload when authentication is provided', () => {
    const mockUpdateDocument = vi.fn()
    const mockUpdate = vi.fn()

    const mockStore = {
      updateDocument: mockUpdateDocument,
      update: mockUpdate,
      workspace: {
        activeDocument: {
          components: {
            securitySchemes: {
              apiKey: {
                description: 'Test API Key old',
              },
            },
          },
        },
      },
    } as unknown as WorkspaceStore

    const config = {
      authentication: {
        securitySchemes: {
          apiKey: {
            description: 'Test API Key new',
            token: 'test-api-key-value',
          },
          bearerAuth: {
            token: 'test-bearer-token',
          },
        },
      },
    } as unknown as ApiReferenceConfiguration

    const isDarkMode = ref(false)

    mapConfigToWorkspaceStore({
      config,
      store: mockStore,
      isDarkMode,
    })

    // Verify updateDocument was called for each security scheme
    expect(mockUpdateDocument).toHaveBeenCalledTimes(2)

    // Verify the first security scheme (apiKey)
    expect(mockUpdateDocument).toHaveBeenCalledWith('active', 'components.securitySchemes.apiKey', {
      token: 'test-api-key-value',
    })

    // Verify the second security scheme (bearerAuth)
    expect(mockUpdateDocument).toHaveBeenCalledWith('active', 'components.securitySchemes.bearerAuth', {
      token: 'test-bearer-token',
    })
  })
})
