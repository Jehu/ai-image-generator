//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    rules: {
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
      // Aus: meldet durchweg False-Positives auf bewusst defensiven Checks an
      // Typgrenzen, wo die statischen Typen die Laufzeit nicht abbilden —
      // Prisma-Json-Casts, Record-/Array-Indexzugriffe (kein
      // noUncheckedIndexedAccess), Server-Function-Validatoren (unvalidierter
      // Input), Browser-Globals (navigator.clipboard) und das externe Gemini-SDK.
      '@typescript-eslint/no-unnecessary-condition': 'off',
    },
  },
  {
    ignores: [
      'eslint.config.js',
      'prettier.config.js',
      // Generierte und Build-Artefakte nie linten
      '.output/**',
      '.nitro/**',
      '.tanstack/**',
      'dist/**',
      'src/generated/**',
      'src/routeTree.gen.ts',
    ],
  },
]
