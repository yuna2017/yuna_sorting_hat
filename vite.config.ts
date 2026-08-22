import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages serves this repo at /yuna_sorting_hat/. VITE_BASE lets a root-path
// host (e.g. Cloudflare Pages) override it without touching this file.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/yuna_sorting_hat/',
  plugins: [react(), tailwindcss()],
})
