const createComment = (block, width) => [
  ' '.padEnd(width - 1, '*'),
  ` ${block.name} `.padEnd(width - 1, '*'),
];

module.exports = {
  createComment,
  ignoreRequire: true,
};
