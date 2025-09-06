import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    server: {
      port: parseInt(env.FRONTEND_PORT) || parseInt(env.DEFAULT_FRONTEND_PORT) || 3020,
      open: true
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets'
    }
  };
});