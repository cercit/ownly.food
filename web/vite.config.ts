import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

export default defineConfig({
  // Relative paths so the same build works at the site root (Vercel) and under /ownly.food/ (GitHub Pages).
  base: './',
  plugins: [react(), tailwindcss()],
});
