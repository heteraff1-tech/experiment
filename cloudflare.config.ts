import { defineConfig } from 'cf/config';

export default defineConfig({
  worker: {
    name: 'harness-demo',
    compatibilityDate: '2026-11-19',
    workersDev: true
  }
});
