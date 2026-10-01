import { build } from 'esbuild'

await build({
  entryPoints: ['server/vercel.ts'],
  outfile: 'api/[...path].js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  packages: 'external',
})
