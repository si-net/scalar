import { createMemoryHistory, createRouter, createWebHashHistory, createWebHistory } from 'vue-router'

/** Router for the API client app */
export const createWebHistoryRouter = () =>
  createRouter({
    history: createWebHistory(),
    routes: [
      {
        name: 'sidebar-layout',
        path: '',
        component: () => import('@v2/domains/sidebar/components/SidebarView.vue'),
        children: [],
        props: { test: 123 },
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
