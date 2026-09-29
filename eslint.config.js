import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Transcendental Math functions can differ between JS engines, so the simulation
// must use the deterministic helpers in core/ instead (see CLAUDE.md).
const NON_DETERMINISTIC_MATH = [
  'random',
  'exp',
  'expm1',
  'log',
  'log1p',
  'log2',
  'log10',
  'pow',
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'atan2',
  'sinh',
  'cosh',
  'tanh',
  'asinh',
  'acosh',
  'atanh',
  'cbrt',
  'hypot',
];

const DOM_GLOBALS = ['window', 'document', 'navigator', 'localStorage', 'indexedDB', 'self'];

const layerImportBan = (layers, message) => ({
  patterns: [{ regex: `(^|/)(${layers.join('|')})(/|$)`, message }],
});

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', 'src/content/generated', 'data'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    files: ['**/*.js'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ['scripts/**/*.js', '*.config.js'],
    languageOptions: { globals: globals.node },
  },
  // Logic layers never touch the browser and never import the view.
  {
    files: ['src/**/*.ts', 'pipeline/**/*.ts'],
    ignores: ['src/view/**', 'src/main.ts', 'src/worker/bootstrap.ts'],
    rules: {
      'no-restricted-globals': ['error', ...DOM_GLOBALS],
      'no-restricted-imports': [
        'error',
        layerImportBan(['view'], 'Logic must not depend on the view layer.'),
      ],
    },
  },
  // The simulation core is deterministic and knows nothing about presentation.
  {
    files: ['src/core/**/*.ts', 'src/sim/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', ...DOM_GLOBALS, 'Date', 'performance', 'crypto'],
      'no-restricted-properties': [
        'error',
        ...NON_DETERMINISTIC_MATH.map((property) => ({
          object: 'Math',
          property,
          message: 'Not deterministic across engines; use core/ helpers.',
        })),
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "BinaryExpression[operator='**']",
          message: 'Exponentiation is not deterministic across engines; use core/ helpers.',
        },
      ],
      'no-restricted-imports': [
        'error',
        layerImportBan(
          ['view', 'vm', 'app', 'worker'],
          'The simulation core must not depend on presentation layers.',
        ),
      ],
    },
  },
);
