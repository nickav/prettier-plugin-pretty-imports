const path = require('path');
const {
  parsers: { babel: babelParser },
} = require('prettier/parser-babylon');
const j = require('jscodeshift');

const {
  isExternalModule,
  isScopedExternalModule,
  isInternalModule,
  isLocalModule,
} = require('./matchers');

// Based on https://github.com/bfncs/codemod-imports-sort/

const ucfirst = (str) => str[0].toUpperCase() + str.slice(1);

const createComment = (block, width = 80) => [
  ' '.padEnd(width - 1, '-'),
  ` ${block.name} `.padEnd(width - 1, '-'),
];

const getImportBlockName = (node, options) => {
  const { value } = node.source;

  if (isExternalModule(value)) {
    return 'Node Modules';
  }

  if (
    value.startsWith('./') &&
    (value.endsWith('.css') || value.endsWith('.scss'))
  ) {
    return 'Style';
  }

  if (value.startsWith('@/')) {
    const name = value.replace('@/', '').split('/')[0];
    return ucfirst(name);
  }

  if (isLocalModule(value)) {
    const parts = options.filepath.split(path.sep);
    const pathStart = (parts.length > 1
      ? parts.slice(0, parts.length - 1)
      : []
    ).join(path.sep);
    const fileName = parts[parts.length - 1];
    const importPath = path.resolve(pathStart, value);

    if (importPath.includes('/src/')) {
      return ucfirst(importPath.split('/src/')[1].split('/')[0]);
    }

    return 'Modules';
  }

  return 'Modules';
};

const getImportBlock = (node, options) => {
  const name = getImportBlockName(node, options);

  const blockOrder = [
    'Node Modules',
    'Modules',
    'Style',
    'Components',
    'Actions',
    'Store',
    'Helpers',
  ];

  const index = blockOrder.indexOf(name);

  return { name, order: index >= 0 ? index : blockOrder.length + 1 };
};

const sortBlocks = (blocks) => blocks.slice().sort((a, b) => a.order - b.order);

const getImportModuleOrder = (path) => {
  const importOrder = [
    isExternalModule,
    isScopedExternalModule,
    isInternalModule,
    isLocalModule,
  ];

  const i = importOrder.findIndex((matcher) => matcher(path));
  return i >= 0 ? i : importOrder.length + 1;
};

const sortNodes = (nodes) =>
  nodes.slice().sort((a, b) => {
    const aIndex = getImportModuleOrder(a.source.value);
    const bIndex = getImportModuleOrder(b.source.value);

    if (aIndex === bIndex) {
      return a.source.value.localeCompare(b.source.value);
    }

    return bIndex - aIndex;
  });

// TODO(nick): allow users to provide their own config
const config = {
  createComment,
  getImportBlock,
  sortBlocks,
  sortNodes,
};

const parsers = {
  babel: {
    ...babelParser,

    parse(text, parsers, options) {
      const ast = babelParser.parse(text, parsers, options);

      const root = j(ast);
      const declarations = root.find(j.ImportDeclaration);

      if (!declarations.length) {
        return ast;
      }

      // TODO(nick): join imports from the same paths

      // Get sections
      const blocks = Object.values(
        declarations.nodes().reduce((memo, node) => {
          const block = config.getImportBlock(node, {
            filepath: options.filepath,
          });

          if (!memo[block.name])
            memo[block.name] = Object.assign(block, { nodes: [] });

          memo[block.name].nodes.push(node);
          return memo;
        }, {})
      );

      // Sort blocks
      const sortedBlocks = config.sortBlocks(blocks);

      // Sort nodes
      sortedBlocks.forEach((block) => {
        block.nodes = config.sortNodes(block.nodes);
      });

      // Save file header comment
      const firstNode = declarations.nodes()[0];
      const firstNodeComments = (firstNode.leadingComments || []).slice();

      // Remove previous import comments
      const importComments = declarations
        .nodes()
        .map((node) => node.leadingComments)
        .filter((e) => e)
        .flat(1);

      ast.comments = ast.comments.filter(
        (comment) =>
          !importComments.some(
            (e) => e.start === comment.start && e.end === comment.end
          )
      );

      // Remove old declarations
      declarations.remove();

      // Insert new comment blocks
      const body = ast.program.body;

      sortedBlocks
        .slice()
        .reverse()
        .forEach((block) => {
          block.nodes[0].comments = config
            .createComment(block, options.printWidth)
            .map((line) => j.commentLine(line));

          block.nodes
            .slice()
            .reverse()
            .forEach((node, i) => {
              body.unshift(node);
            });
        });

      // Restore file header comment
      if (firstNodeComments.length) {
        if (firstNodeComments[0].type === 'CommentBlock') {
          const fileHeaderComment = firstNodeComments[0].value;
          const rawComment = `/*${fileHeaderComment}*/`;
          j(
            root
              .find(j.ImportDeclaration)
              .at(0)
              .get()
          ).insertBefore(rawComment + '\n');
        }
      }

      return ast;
    },

    preprocess(text, options) {
      if (babelParser.preprocess) {
        text = babelParser.preprocess(text, options);
      }

      const isImportLine = (line) =>
        line.startsWith('import') ||
        (!line.startsWith('//') &&
          (line.includes('} from "') || line.includes("} from '")));

      const lines = text.split('\n');

      // Remove newlines after imports
      // TODO(nick): is there a better way to do this?
      return lines
        .filter(
          (line, i, lines) =>
            i < 1 || (isImportLine(lines[i - 1]) ? line.length : true)
        )
        .join('\n');
    },
  },
};

module.exports = {
  parsers,
};
