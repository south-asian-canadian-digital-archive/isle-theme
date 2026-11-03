import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('dist/viewers', { recursive: true });
for (const name of ['images', 'av']) {
  const result = await Bun.build({ entrypoints: [`viewers/${name}.jsx`], outdir: 'dist/viewers',
    target: 'browser', format: 'iife', minify: true,
    define: { 'process.env.NODE_ENV': JSON.stringify('production') } });
  if (!result.success) { console.error(result.logs); process.exit(1); }
}
await copyFile('node_modules/@samvera/ramp/dist/ramp.css', 'dist/viewers/ramp.css');
