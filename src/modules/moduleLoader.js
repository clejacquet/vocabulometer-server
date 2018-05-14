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

const out = (cb) => {
    getDirs('src/modules', (err, dirs) => {
        if (err) {
            return cb(err);
        }

        const moduleList = dirs
            .map(dir => {
                const Module = require(path.resolve('src/modules/' + dir + '/module'));
                return new Module(dir);
            });

        const modules = {};
        moduleList.forEach((module) => {
            modules[module.name] = module;
        });

        cb(undefined, modules);
    });
};


module.exports = out;