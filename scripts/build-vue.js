/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
/* eslint no-console: "off" */
/* eslint global-require: "off" */
/* eslint no-param-reassign: ["error", { "props": false }] */

const gulp = require('gulp');
const fs = require('fs');

const rollup = require('rollup');
const buble = require('rollup-plugin-buble');
const replace = require('rollup-plugin-replace');

const header = require('gulp-header');
const uglify = require('gulp-uglify');
const sourcemaps = require('gulp-sourcemaps');
const rename = require('gulp-rename');
const bannerVue = require('./banner-vue');

function esm({ banner, componentImports, componentExports }) {
  return `
${banner}

${componentImports.join('\n')}
import Framework7Vue from './utils/plugin';

export {\n${componentExports.join(',\n')}\n};

export default Framework7Vue;
  `.trim();
}

function buildVue(cb) {
  const env = process.env.NODE_ENV || 'development';
  const buildPath = env === 'development' ? './build' : './packages';
  const pluginContent = fs.readFileSync(`./${buildPath}/vue/utils/plugin.js`, 'utf-8');

  /* Replace plugin vars: utils/plugin.js */
  const newPluginContent = pluginContent
    .replace('// IMPORT_LIBRARY', 'import Vue from \'vue\';')
    .replace('// IMPORT_COMPONENTS\n', '')
    .replace('// REGISTER_COMPONENTS\n', '')
    .replace(/EXTEND/g, 'params.Vue || Vue')
    .replace(/COMPILER/, '\'vue\'');

  fs.writeFileSync(`${buildPath}/vue/utils/plugin.js`, newPluginContent);

  /* Build main components esm module: framework7-vue.esm.js */
  const files = fs.readdirSync(`${buildPath}/vue/components`);
  const components = [];
  const componentImports = [];
  const componentExports = [];

  files.forEach((fileName) => {
    const componentName = fileName
      .replace('.js', '')
      .split('-')
      .map((word, index) => {
        const capitalized = word[0].toUpperCase() + word.substr(1);
        return index === 0 ? `f7${capitalized}` : capitalized;
      })
      .join('');
    components.push({
      name: `f7-${fileName.replace('.js', '')}`,
      importName: componentName,
    });
    componentImports.push(`import ${componentName} from './components/${fileName.replace('.js', '')}';`);
    componentExports.push(`  ${componentName}`);
  });

  const componentsContent = esm({
    banner: bannerVue.trim(),
    componentImports,
    componentExports,
  });

  fs.writeFileSync(`${buildPath}/vue/framework7-vue.esm.js`, componentsContent);

  /* Build esm module bundle: components + plugin -> framework7-vue.esm.bundle.js */
  const registerComponents = components
    .map(c => `Vue.component('${c.name}', ${c.importName});`)
    .join('\n    ');

  const esmBundlePluginContent = pluginContent
    .replace(/ from '\.\//g, ' from \'./utils/')
    .replace('// IMPORT_LIBRARY', 'import Vue from \'vue\';')
    .replace('// IMPORT_COMPONENTS', `${componentImports.join('\n')}\n`)
    .replace('// REGISTER_COMPONENTS', registerComponents)
    .replace(/EXTEND/g, 'params.Vue || Vue')
    .replace(/COMPILER/, '\'vue\'');

  fs.writeFileSync(`${buildPath}/vue/framework7-vue.esm.bundle.js`, bannerVue + esmBundlePluginContent);

  /* Build UMD from esm bundle: framework7-vue.esm.bundle.js -> framework7-vue.js */
  rollup.rollup({
    input: `${buildPath}/vue/framework7-vue.esm.bundle.js`,
    external: ['vue'],
    plugins: [
      replace({
        delimiters: ['', ''],
        'process.env.NODE_ENV': JSON.stringify(env), // or 'production'
      }),
      buble({
        objectAssign: 'Object.assign',
      }),
    ],
  }).then(bundle => bundle.write({
    globals: {
      vue: 'Vue',
    },
    strict: true,
    file: `${buildPath}/vue/framework7-vue.js`,
    format: 'umd',
    name: 'Framework7Vue',
    sourcemap: env === 'development',
    sourcemapFile: `${buildPath}/vue/framework7-vue.js.map`,
    banner: bannerVue,
  })).then(() => {
    if (env === 'development') {
      if (cb) cb();
      return;
    }
    // Minified version
    gulp.src(`${buildPath}/vue/framework7-vue.js`)
      .pipe(sourcemaps.init())
      .pipe(uglify())
      .pipe(header(bannerVue))
      .pipe(rename((filePath) => {
        filePath.basename += '.min';
      }))
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest(`${buildPath}/vue/`))
      .on('end', () => {
        if (cb) cb();
      });
  }).catch((err) => {
    if (cb) cb();
    console.log(err);
  });
}

module.exports = buildVue;
