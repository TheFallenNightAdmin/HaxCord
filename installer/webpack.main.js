module.exports = config => {
    delete config.optimization.namedModules;
    config.output.hashFunction = "sha256";
    return config;
};
