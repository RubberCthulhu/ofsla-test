import { fileURLToPath } from 'node:url';
import preact from '@preact/preset-vite';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  // банк вопросов и картинки берутся из data/ без копирования
  publicDir: '../data',
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      pwaAssets: {
        image: 'assets/icon.svg',
        preset: 'minimal-2023',
        // ссылки на иконки прописаны в index.html: так Vite сам кладёт icon.svg в сборку
        includeHtmlHeadLinks: false,
        // publicDir занят данными; иконки генерируются из web/assets прямо в dist
        integration: { publicDir: fileURLToPath(new URL('assets', import.meta.url)), outDir: fileURLToPath(new URL('dist', import.meta.url)) },
      },
      manifest: {
        name: 'ОФСЛА: подготовка к экзамену пилота параплана',
        short_name: 'ОФСЛА тест',
        description: 'Тренажёр вопросов экзамена «Пилот СВС 115»',
        lang: 'ru',
        display: 'standalone',
        theme_color: '#1d4ed8',
        background_color: '#ffffff',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json}'],
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
