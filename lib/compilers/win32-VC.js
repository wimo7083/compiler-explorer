const Win32Compiler = require('./win32'),
    argumentParsers = require("./argument-parsers"),
    AsmParser = require('../asm-parser-cl.js');

class Win32CLCompiler extends Win32Compiler {
    constructor(info, env) {
        info.supportsFiltersInBinary = true;
        super(info, env);
        this.asm = new AsmParser(this.compilerProps);
    }

    getArgumentParser() {
        return argumentParsers.Base;
    }

    optionsForFilter(filters, outputFilename) {
        return [
            '/nologo',
            '/FA',
            '/c',
            '/Fa' + this.filename(outputFilename),
            '/Fo' + this.filename(outputFilename + '.obj')
        ];
    }
}

module.exports = Win32CLCompiler;
