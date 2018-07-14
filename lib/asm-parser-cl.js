const AsmParserBase = require('./asm-parser'),
    utils = require('./utils');

class AsmParser extends AsmParserBase {
    constructor(compilerProps) {
        super(compilerProps);
        this.location = /( {2}[0-9a-f]{4} )|(\s+)/g;
        this.opcodeNumber = /(( {2}[0-9a-f]{4})|\s+)( [0-9a-f]{2})*\s*/g;
        this.labelKind = /COMDAT|PROC|PUBLIC|EXTRN|SEGMENT|ENDS|ENDP/g;

    }

    hasOpcode(line) {
        // note: cl doesn't output leading labels
        // strip comments
        line = line.split(/[#;]/, 1)[0];
        // check for a local label definition
        if (line.match(/[a-zA-Z$_]+ =/)) return false;
        // check for label kinds
        if (line.match(this.labelKind)) return false;
        // check for data
        if (line.match(this.dataKind)) return false;
        
        return !!line.match(this.hasOpcodeRe);
    }

    processAsm(asm, filters) {
        if (filters.binary) {
            return ["please don't use binary yet; flip the switch plis"];
        }

        const asmLines = utils.splitLines(asm);

        let result = [];
        asmLines.forEach(line => {
            if (line.trim() === "") {
                result.push({text: "", source: null});
                return;
            }

            
        });
        return result;
    }
}

module.exports = AsmParser;
