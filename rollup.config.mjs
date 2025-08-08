import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';

/** @type {import('rollup').RollupOptions} */
export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/watcher.cjs.js',
      format: 'cjs',
    },
    {
      file: 'dist/watcher.esm.js',
      format: 'esm',
    },
    {
      file: 'dist/watcher.umd.js',
      format: 'umd',
      name: 'SilentWatch',
    },
  ],
  plugins: [typescript(), resolve()],
};
