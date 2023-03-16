import { defineStore } from 'pinia'
import { getToken, removeToken, setToken } from './helper'
import { store } from '@/store'

export interface AuthState {
  token: string | undefined
  session: { auth: boolean } | null
}

export const useAuthStore = defineStore('auth-store', {
  state: (): AuthState => ({
    token: getToken(),
    session: null,
  }),

  actions: {
    async getSession() {
      try {
        // const { data } = await fetchSession<{ auth: boolean }>()
        // const { data } = { data: { auth: true }
        this.session = { auth: true }
        return Promise.resolve({ auth: true })
      }
      catch (error) {
        return Promise.resolve({ auth: true })
        return Promise.reject(error)
      }
    },

    setToken(token: string) {
      this.token = token
      setToken(token)
    },

    removeToken() {
      this.token = undefined
      removeToken()
    },
  },
})

export function useAuthStoreWithout() {
  return useAuthStore(store)
}
