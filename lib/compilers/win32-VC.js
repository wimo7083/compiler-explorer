const Win32Compiler = require('./win32'),
    asmCl = require('../asm-cl'),
    argumentParsers = require("./argument-parsers");

class Win32CLCompiler extends Win32Compiler {
    constructor(info, env) {
        info.supportsFiltersInBinary = true;
        super(info, env);
        this.asm = new asmCl.AsmParser();
    }

    getArgumentParser() {
        return argumentParsers.Base;
    }

    optionsForFilter(filters, outputFilename) {
        return [
            '/FAsc',
            '/c',
            '/Fa' + this.filename(outputFilename),
            '/Fo' + this.filename(outputFilename + '.obj')
        ];
    }
}

module.exports = Win32CLCompiler;