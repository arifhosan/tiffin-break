import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Served at arifhosan.me/tiffin-break/: the build lands in dist/tiffin-break so the Worker's asset paths match.
export default defineConfig({ plugins: [react()], base: './', build: { outDir: 'dist/tiffin-break', emptyOutDir: true } })
