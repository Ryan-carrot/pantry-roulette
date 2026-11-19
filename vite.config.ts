import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/',
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    css: true,
    environmentOptions: {
      happyDOM: {
        /*
         * Tests are hermetic. happy-dom otherwise fetches any stylesheet, script or
         * iframe in markup a test parses (index.html links Google Fonts), and the
         * request is aborted at teardown with errors after the summary.
         */
        settings: {
          disableCSSFileLoading: true,
          disableJavaScriptFileLoading: true,
          disableIframePageLoading: true,
          handleDisabledFileLoadingAsSuccess: true,
        },
      },
    },
  },
});
