// LocalStorage helper functions
export const storage = {
  setToken: (token: string) => {
    localStorage.setItem('accessToken', token)
  },

  getToken: (): string | null => {
    return localStorage.getItem('accessToken')
  },

  removeToken: () => {
    localStorage.removeItem('accessToken')
  },

  setUser: (user: unknown) => {
    localStorage.setItem('user', JSON.stringify(user))
  },

  getUser: () => {
    const user = localStorage.getItem('user')
    return user ? JSON.parse(user) : null
  },

  removeUser: () => {
    localStorage.removeItem('user')
  },

  clear: () => {
    localStorage.clear()
  },
}
