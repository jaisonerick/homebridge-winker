module.exports = {
  targets: {
    node: 18,
  },
  presets: [
    ["@babel/preset-env", { modules: "commonjs" }],
    "@babel/preset-typescript",
  ],
};
