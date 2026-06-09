import esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  platform: 'browser',
  format: 'cjs',
  target: 'es2022',
  outfile: 'dist/main.js',
  external: ['obsidian'],
  sourcemap: false,
  minify: true,
});
