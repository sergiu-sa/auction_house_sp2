import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: './index.html',
        collection: './collection.html',
        listing: './listing.html',
        login: './login.html',
        register: './register.html',
        profile: './profile.html',
        'listing-create': './listing-create.html',
        'listing-edit': './listing-edit.html',
      },
    },
  },
})
