import {
  defineConfig,
  minimal2023Preset,
} from '@vite-pwa/assets-generator/config'

// Generates PNG app icons (and favicon) from the brand SVG so installs look
// crisp on every platform, including iOS where SVG icons aren't reliable.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: minimal2023Preset,
  images: ['public/pwa-icon.svg'],
})
