const esbuild = require('esbuild');
const fs = require('fs');

/**
 * esbuild plugin to load .njk files as raw string exports.
 * This allows `import tpl from './templates/controls/wc-input.njk'`
 * to resolve to the file's contents as a string.
 */
const njkLoader = {
  name: 'njk-loader',
  setup(build) {
    build.onLoad({ filter: /\.njk$/ }, async (args) => {
      const contents = await fs.promises.readFile(args.path, 'utf8');
      return {
        contents: `export default ${JSON.stringify(contents)};`,
        loader: 'js',
      };
    });
  },
};

esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  outfile: 'dist/template-craft.js',
  format: 'iife',
  globalName: 'templateCraft',
  minify: false,
  sourcemap: true,
  plugins: [njkLoader],
}).then(() => {
  console.log('Build complete: dist/template-craft.js');
});

esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  outfile: 'dist/template-craft.min.js',
  format: 'iife',
  globalName: 'templateCraft',
  minify: true,
  sourcemap: true,
  plugins: [njkLoader],
}).then(() => {
  console.log('Build complete: dist/template-craft.min.js');
});
