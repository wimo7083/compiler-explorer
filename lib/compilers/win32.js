const BaseCompiler = require('../base-compiler'),
    temp = require('temp');

class Win32Compiler extends BaseCompiler {    
    newTempDir() {
        return new Promise((resolve, reject) => {
            temp.mkdir({prefix: 'compiler-explorer-compiler', dir: process.env.TMP}, (err, dirPath) => {
                if (err)
                    reject(`Unable to open temp file: ${err}`);
                else
                    resolve(dirPath);
            });
        });
    }

    supportsObjdump() {
        return false;
    }

    exec(compiler, args, options_) {
        let options = Object.assign({}, options_);
        options.env = Object.assign({}, options.env);

        const setEnvVar = function (name, newVar) {
            if (newVar) {
                const oldVar = options.env[name] ? options.env[name] : "";
                options.env[name] = newVar + oldVar;
            }
        };

        setEnvVar('INCLUDE', this.compiler.includePath);
        setEnvVar('LIB', this.compiler.libPath);

        return super.exec(compiler, args, options);
    }
}

module.exports = Win32Compiler;
