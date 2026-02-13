import { defineConfig } from 'oxlint'

export default defineConfig({
  plugins: ['typescript'],
  categories: {
    correctness: 'warn',
  },
  ignorePatterns: ['node_modules', 'dist', 'build', 'yap'],
})
