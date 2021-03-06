const fs = require('fs');
const path = require('path');

const getDirs = function(rootDir, cb) {
    fs.readdir(rootDir, function(err, files) {
        if (err) {
            return cb(err);
        }

        const dirs = [];
        for (let index = 0; index < files.length; ++index) {
            let file = files[index];
            if (file[0] !== '.') {
                let filePath = rootDir + '/' + file;
                fs.stat(filePath, function(err, stat) {
                    if (err) {
                        return cb(err);
                    }

                    if (stat.isDirectory()) {
                        dirs.push(this.file);
                    }
                    if (files.length === (this.index + 1)) {
                        return cb(undefined, dirs);
                    }
                }.bind({index: index, file: file}));
            }
        }
    });
};

const out = (models, cb) => {
    fs.readFile('src/modules/modules.json', 'utf8', (err, file) => {
        if (err) {
            return cb(err);
        }

        const modulesDoc = JSON.parse(file).modules;

        const modules = {};

        Object.keys(modulesDoc).forEach(language => {
            modules[language] = {};

            modulesDoc[language].forEach((module) => {
                const Module = require(path.resolve(`src/modules/${language}/${module.path}/moduleIndex`));
                modules[language][module.name] = new Module(module.name, language, models);
            });
        });

        cb(undefined, modules);
    });
};


module.exports = out;