import { createMemoryHistory, createRouter, createWebHashHistory, createWebHistory } from 'vue-router'

import { modalRoutes, routes } from '@/routes'

/** Router for the API client app */
export const createWebHistoryRouter = () =>
  createRouter({
    history: createWebHistory(),
    routes: [
      {
        name: 'sidebar-layout',
        path: '',
        component: () => import('@v2/domains/sidebar/components/SidebarView.vue'),
        redirect: (to) => ({
          name: 'request',
          params: { ...to.params, request: 'default' },
          props: { test: 123 },
        }),
        children: [],
      },
    ],
  })

/** Router factory for the API client app (but using hash history) */
export const createWebHashRouter = () =>
  createRouter({
    history: createWebHashHistory(),
    routes,
  })

/** Router factory for the API Client modal */
export const createModalRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: modalRoutes,
  })
