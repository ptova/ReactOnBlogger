import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
const baseUrl = process.env.NODE_ENV === 'production' ? 'https://cdn.jsdelivr.net/gh/ptova/ReactOnBlogger@svil/dist/' : '/';
export default defineConfig({
    plugins: [react()],
    base:    baseUrl,
    build:   {
        rollupOptions:     {
            output: {
                entryFileNames: 'index.[hash].js',
                chunkFileNames: '[name].[hash].js',
                assetFileNames: (assetInfo) => {
                    // Check if any name in the names array ends with .css
                    const isCss = assetInfo.names?.some(name => name.endsWith('.css'))
                    if (isCss) {
                        return 'index.[hash].css'
                    }
                    // For other assets (SVG, etc.), you can inline them or skip
                    return 'assets/[name].[hash][extname]'
                }
            }
        }, // Inline small assets to prevent extra files
        assetsInlineLimit: 100000000,
        copyPublicDir:     false
    }
})