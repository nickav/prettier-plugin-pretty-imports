const isBuiltinModule = require('is-builtin-module');

const CURRENT_DIRECTORY_PREFIX = './';
const PARENT_DIRECTORY_PREFIX = '../';

exports.isExternalModule = path => {
  return /^[\w-]+$/.test(path) && !isBuiltinModule(path);
};

// 1. start with @
// 2. see if it's a word or '-' (one or more times)
// 3. see if it optionally ends with a '/'
// 4. Recursively check again
exports.isScopedExternalModule = path =>
  /^@(?:[\w-]+\/?[\w-])+$/.test(path) && !isBuiltinModule(path);

exports.isInternalModule = path => /^[\w-]+(\/[\w-]+)+$/.test(path);

exports.isLocalModuleFromParentDirectory = path =>
  path.startsWith(PARENT_DIRECTORY_PREFIX);

const isLocalModuleCurrentDirectoryIndex = exports.isLocalModuleCurrentDirectoryIndex = path =>
  path === CURRENT_DIRECTORY_PREFIX;

exports.isLocalModuleFromSiblingDirectory = path =>
  !isLocalModuleCurrentDirectoryIndex(path) &&
  path.startsWith(CURRENT_DIRECTORY_PREFIX);
