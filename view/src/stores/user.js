import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    token: null,
    config: null
  }),
  persist: {
    key: 'blist',
    storage: localStorage,
    serializer: {
      serialize: state => JSON.stringify(state),
      deserialize: value => JSON.parse(value)
    }
  }
})
