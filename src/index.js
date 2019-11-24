const { parsers } = require('prettier/parser-babylon');
const j = require('jscodeshift');

//const compareImports = require('./compareImports').default;
const {
  isExternalModule,
  isScopedExternalModule,
  isInternalModule,
  isLocalModuleFromParentDirectory,
  isLocalModuleCurrentDirectoryIndex,
  isLocalModuleFromSiblingDirectory,
} = require('./matchers');

// Based on https://github.com/bfncs/codemod-imports-sort/

const babelParser = parsers['babel'];

const createComment = (block, width = 80) => [
  ' '.padEnd(width - 1, '-'),
  ` ${block.name} `.padEnd(width - 1, '-'),
];

const getImportBlock = (node) => {
  const { value } = node.source;

  if (isExternalModule(value)) {
    return { name: 'Node Modules', order: 0 };
  }

  return { name: 'Other', order: 1 };
};

const sortBlocks = (blocks) => blocks.slice().sort((a, b) => a.order - b.order);

const sortNodes = (nodes) =>
  nodes.slice().sort((a, b) => a.source.value.localeCompare(b.source.value));

const api = {
  createComment,
  getImportBlock,
  sortBlocks,
  sortNodes,
};

exports.parsers = {
  babel: {
    ...babelParser,

    parse(...args) {
      const ast = babelParser.parse(...args);

      const declarations = j(ast).find(j.ImportDeclaration);

      if (declarations.length <= 1) {
        return ast;
      }

      // TODO(nick): join imports from the same paths

      // Get sections
      const blocks = Object.values(
        declarations.nodes().reduce((memo, node) => {
          const block = api.getImportBlock(node);

          if (!memo[block.name])
            memo[block.name] = Object.assign(block, { nodes: [] });

          memo[block.name].nodes.push(node);
          return memo;
        }, {})
      );

      // Sort blocks
      const sortedBlocks = api.sortBlocks(blocks);
      // Sort nodes
      sortedBlocks.forEach((block) => {
        block.nodes = api.sortNodes(block.nodes);
      });

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

      // remove old declarations
      declarations.remove();

      const body = ast.program.body;

      sortedBlocks
        .slice()
        .reverse()
        .forEach((block) => {
          const printWidth = args[2].printWidth || 80;
          block.nodes[0].comments = api
            .createComment(block, printWidth)
            .map((line) => j.commentLine(line));

          block.nodes
            .slice()
            .reverse()
            .forEach((node, i) => {
              body.unshift(node);
            });
          //body.unshift(block.nodes);
        });

      //sortedDeclarations.forEach((dec) => body.unshift(dec));

      return ast;
    },

    preprocess(text, options) {
      if (babelParser.preprocess) {
        text = babelParser.preprocess(text, options);
      }

      console.log(options);

      return text;
    },
  },

  /*
  'json-stringify': {
    ...parser,
    preprocess(text, options) {
      //console.log('preprocessing!');

      if (parser.preprocess) {
        text = parser.preprocess(text, options);
      }

      if (options.filepath && /(^|\\|\/)package\.json$/.test(options.filepath)) {
        return text.replace('version', 'hello');
      }

      return text;
    },
  },
  */
};
