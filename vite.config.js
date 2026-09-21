import { defineConfig } from 'vite'

export default defineConfig({
	base: './',
	resolve: {
		dedupe: ['three'],
	},
	build: {
		minify: 'esbuild',
		chunkSizeWarningLimit: 1200,
	},
})
