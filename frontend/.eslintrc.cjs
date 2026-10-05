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
          exclude: [
            'Travian',
            // Common formatting characters and symbols
            'x', 'X', 'vs', '+', '-', '/', '%', ':', '|',
            // Level indicators
            'Lv', 'Lv\\.\\d+',
            // Number formats
            '\\d+x', '\\d+h', '\\d+m', '\\d+s',
          ],
        },
        // Ignore template literal expressions
        ignoreCallee: ['t', 'i18n.t'],
      },
    ],
  },

  // guideCalcs：雙語 JSX 會讓 i18next/no-literal-string crash（/^+$/）。
  // 只關這條；其餘 eslint 規則照常跑。
  overrides: [
    {
      files: ['src/features/guideCalcs/**/*.{ts,tsx}'],
      rules: {
        'i18next/no-literal-string': 'off',
        // Helpers (planGreedy, simulate, lumiBracket) exported for unit tests
        'react-refresh/only-export-components': 'off',
      },
    },
  ],
}
