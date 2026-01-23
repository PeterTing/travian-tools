module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:i18next/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'src/components/ui/**'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', 'i18next'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'i18next/no-literal-string': [
      'error',
      {
        mode: 'jsx-text-only',
        'jsx-attributes': {
          include: ['label', 'placeholder', 'alt', 'title', 'aria-label'],
        },
        words: {
          exclude: ['Travian'],
        },
      },
    ],
  },
}
