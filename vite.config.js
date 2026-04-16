import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // On GitHub Actions GITHUB_ACTIONS=true is set automatically.
  // Local dev stays at http://localhost:5173/
  // GitHub Pages serves at https://shanmukhvaduguru.github.io/JSON2CSV/
  base: process.env.GITHUB_ACTIONS ? '/JSON2CSV/' : '/',
})
