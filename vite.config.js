import { defineConfig } from 'vite'

export default defineConfig({
	base: '/museum/',
	resolve: {
		dedupe: ['three'],
	},
	build: {
		minify: 'esbuild',
		chunkSizeWarningLimit: 1200,
	},
})
