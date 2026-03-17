import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/12thManCameraTracking/', // <-- replace with your GitHub repo name
  server: {
    port: 3000,
  },
});