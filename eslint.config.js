import pluginJs from '@eslint/js'
import unusedImports from 'eslint-plugin-unused-imports'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'
import tsEslint from 'typescript-eslint'

export default [
  {
    files: ['src/**/*.{js,mjs,cjs,ts,vue}'],
  },
  {
    ignores: [
      'src/scripts/*',
      'src/extensions/core/*',
      'src/types/vue-shim.d.ts',
    ],
  },
  {
    languageOptions: {
      globals: globals.browser,
    },
  },
  pluginJs.configs.recommended,
  ...tsEslint.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  {
    files: ['src/**/*.vue'],
    languageOptions: { parserOptions: { parser: tsEslint.parser } },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/prefer-as-const': 'off',
    },
  },
  {
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/prefer-as-const': 'off',
      'unused-imports/no-unused-imports': 'error',
    },
  },
]
