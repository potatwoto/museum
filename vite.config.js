import { defineConfig } from 'vite'

export default defineConfig({
	base: '/linkwalk/',
	resolve: {
		dedupe: ['three'],
	},
	build: {
		minify: 'esbuild',
		chunkSizeWarningLimit: 1200,
	},
})
