const AsmParserBase = require('./asm-parser'),
    utils = require('./utils');

class AsmParser extends AsmParserBase {
    constructor(compilerProps) {
        super(compilerProps);
        this.miscDirective = /^(|\t)(include|INCLUDELIB|TITLE|\.)/;
        this.localLabelDef = /^([a-zA-Z$_]+) =/;
        this.commentOnly = /^;/;
        this.filenameComment = /^; File (.+)/;
        this.lineNumberComment = /^; Line ([0-9]+)/;
        this.beginSegment = /^(CONST|_BSS|[prx]?data(\$[a-zA-Z]+)?|_TEXT|text(\$[a-zA-Z]+)?)\s+SEGMENT/;
        this.endSegment = /^(CONST|_BSS|[prx]?data(\$[a-zA-Z]+)?|_TEXT|text(\$[a-zA-Z]+)?)\s+ENDS/;

        this.labelDef = /^([a-zA-Z$@?_][a-zA-Z0-9$@?_<>]*)\s+(PROC|=|D[BWDQ])/;
        this.definesGlobal = /^(PUBLIC|EXTRN)\s+/;
        this.definesFunction = /^([a-zA-Z$@?_][a-zA-Z0-9$@?_<>]*)\s+PROC/;
        this.labelFind = /[a-zA-Z$?@_][a-zA-Z0-9$?@_<>]*/g;
        this.dataDefn = /^([a-zA-Z$?_][a-zA-Z0-9$@?_<>]* D[BWDQ]\s|\s+D[BWDQ]\s|\s+ORG)/;

        // these are set to an impossible regex, because VC doesn't have inline assembly
        this.startAppBlock = this.startAsmNesting = /a^/;
        this.endAppBLock = this.endAsmNesting = /a^/;
        // same, but for CUDA
        this.cudaBeginDef = /a^/;
    }

    hasOpcode(line) {
        // note: cl doesn't output leading labels
        // strip comments
        line = line.split(';', 1)[0];
        // check for empty lines
        if (line.length === 0) return false;
        // check for a local label definition
        if (line.match(this.localLabelDef)) return false;
        // check for global label definitions
        if (line.match(this.globalLabelDef)) return false;
        // check for data definitions
        if (line.match(this.dataDef)) return false;
        // check for segment begin or end
        if (line.match(this.beginSegment) || line.match(this.endSegment)) return false;
        // check for miscellaneous directives
        if (line.match(this.miscDirective)) return false;
        
        return !!line.match(this.hasOpcodeRe);
    }

    labelFindFor() {
        return this.labelFind;
    }

    processAsm(asm, filters) {
        if (filters.binary) {
            return ["please don't use binary yet; flip the switch plis"];
        }

        const getFilenameFromComment = line => {
            const matches = line.match(this.filenameComment);
            if (!matches) {
                return null;
            } else {
                return matches[1];
            }
        };
        const getLineNumberFromComment = line => {
            const matches = line.match(this.lineNumberComment);
            if (!matches) {
                return null;
            } else {
                return parseInt(matches[1]);
            }
        };

        const asmLines = utils.splitLines(asm);
        // note: VC doesn't output unused labels, afaict

        let lastLineWasEmptyOrComment = true;
        const source = {
            file: null,
            line: 0
        };
        let result = [];

        asmLines.forEach(line => {
            // only print one empty line per block of empty lines
            if (line.trim() === "") {
                if (!lastLineWasEmptyOrComment) {
                    result.push({text: "", source: null});
                    lastLineWasEmptyOrComment = true;
                }
                return;
            }

            let tmp = null;
            tmp = getFilenameFromComment(line);
            if (tmp !== null) {
                source.file = tmp;
            } else {
                tmp = getLineNumberFromComment(line);
                if (tmp !== null) {
                    source.line = tmp;
                } else if (line.match(this.endSegment)) {
                    source.file = null;
                }
            }

            if (filters.commentOnly && line.match(this.commentOnly)) return;

            // at the beginnings of segments we would like an empty line
            // to make it more clear where things belong to
            if (line.match(this.beginSegment)) {
                if (!lastLineWasEmptyOrComment) {
                    result.push({text: "", source: null});
                    lastLineWasEmptyOrComment = true;
                }
                if (filters.directives) {
                    return;
                }
            }

            if (filters.directives) {
                if (line.match(this.dataDefn)) {
                    return;
                } else if (line.match(this.definesGlobal)) {
                    return;
                } else if (line.match(this.miscDirective)) {
                    return;
                } else if (line.match(this.endSegment)) {
                    return;
                }
            }

            lastLineWasEmptyOrComment = line.match(this.commentOnly); // we're printing a line here
            line = utils.expandTabs(line);
            result.push({
                text: this.filterAsmLine(line, filters),
                source: this.hasOpcode(line) && source.file ? source : null
            });
        });
        return result;
    }
}

module.exports = AsmParser;
