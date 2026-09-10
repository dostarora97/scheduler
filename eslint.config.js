import eslintPluginTailwindcss from 'eslint-plugin-tailwindcss'
import tseslint from 'typescript-eslint'
import { defineConfig } from 'eslint/config'

export default defineConfig([
  eslintPluginTailwindcss.configs['flat/recommended'] ||
    eslintPluginTailwindcss.configs.recommended,
  ...tseslint.configs.recommended,
  {
    settings: {
      tailwindcss: {
        cssConfigPath: './src/index.css',
        callees: ['cn', 'cva', 'clsx'],
      },
    },
    rules: {
      'tailwindcss/classnames-order': 'warn',
      'tailwindcss/no-contradicting-classname': 'error',
      'tailwindcss/no-unnecessary-arbitrary-value': 'warn',
      'tailwindcss/no-custom-classname': 'warn',
    },
  },
])
