const AsmParserBase = require('./asm-parser'),
    logger = require('./logger').logger,
    utils = require('./utils');

class AsmParser extends AsmParserBase {
    constructor(compilerProps) {
        super(compilerProps);
        this.miscDirective = /^(|\t)(include|INCLUDELIB|TITLE|\.|END$)/;
        this.localLabelDef = /^([a-zA-Z$_]+) =/;
        this.commentOnly = /^;/;
        this.filenameComment = /^; File (.+)/;
        this.lineNumberComment = /^; Line ([0-9]+)/;
        this.beginSegment = /^(CONST|_BSS|[prx]?data(\$[a-zA-Z]+)?|_TEXT|text(\$[a-zA-Z]+)?)\s+SEGMENT/;
        this.endSegment = /^(CONST|_BSS|[prx]?data(\$[a-zA-Z]+)?|_TEXT|text(\$[a-zA-Z]+)?)\s+ENDS/;
        this.beginFunction = /(^; Function compile flags: )|(^_TEXT\s+SEGMENT)|(^[a-zA-Z@$?_][a-zA-Z0-9@$?_<>]*\s+PROC)/;
        this.endFunction = /^([a-zA-Z@$?_][a-zA-Z0-9@$?_<>]*)\s+ENDP/;

        this.labelDef = /^([a-zA-Z@$?_][a-zA-Z0-9@$?_<>]*)\s+(PROC|=|D[BWDQ])/;
        this.definesGlobal = /^(PUBLIC|EXTRN)\s+/;
        this.definesFunction = /^([a-zA-Z@$?_][a-zA-Z0-9@$?_<>]*)\s+PROC/;
        this.labelFind = /[a-zA-Z@$?_][a-zA-Z0-9@$?_<>]*/g;
        this.dataDefn = /^([a-zA-Z@$?_][a-zA-Z0-9@$?_<>]* D[BWDQ]\s|\s+D[BWDQ]\s|\s+ORG)/;

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
        if (line.match(this.definesGlobal)) return false;
        // check for data definitions
        if (line.match(this.dataDefn)) return false;
        // check for segment begin and end
        if (line.match(this.beginSegment) || line.match(this.endSegment)) return false;
        // check for function begin and end
        // note: functionBegin is used for the function compile flags comment
        if (line.match(this.definesFunction) || line.match(this.endFunction)) return false;
        // check for miscellaneous directives
        if (line.match(this.miscDirective)) return false;
        
        return !!line.match(this.hasOpcodeRe);
    }

    labelFindFor() {
        return this.labelFind;
    }

    processAsm(asm, filters) {
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

        const stdInLooking = /<stdin>|^-$|example\.[^/]+$|<source>/;

        let lastLineWasEmpty = true;

        // type source = {file: string option; line: int}
        let source = null; // source
        // type line = {line: string; source: source option}
        // type func =
        //   { lines: line array
        //   ; name: string | undefined
        //   ; initialLine: int
        //   ; file: string option | undefined }
        let resultObject = {
            prefix: [],    // line array
            functions: [], // func array
            postfix: []    // line array
        };

        // note: if currentFunction is null, we're in either `prefix` or `postfix`
        let inPrefix = true;
        let currentFunction = null; // func option

        asmLines.forEach(line => {
            // only print one empty line per block of empty lines
            if (line.trim() === "") {
                if (!lastLineWasEmpty) {
                    const emptyLine = {text: "", source: null};
                    if (currentFunction === null) {
                        if (inPrefix) {
                            resultObject.prefix.push(emptyLine);
                        } else {
                            resultObject.postfix.push(emptyLine);
                        }
                    } else {
                        currentFunction.lines.push(emptyLine);
                    }
                    lastLineWasEmpty = true;
                }
                return;
            }

            let tmp = null;
            tmp = getFilenameFromComment(line);
            if (tmp !== null) {
                if (currentFunction === null) {
                    logger.error("We have a file comment outside of a function: ",
                        line);
                }
                // if the file is the "main file", give it the file `null`
                if (tmp.match(stdInLooking)) {
                    currentFunction.file = null;
                } else {
                    currentFunction.file = tmp;
                }
                source = {file: currentFunction.file, line: 0};
            } else {
                tmp = getLineNumberFromComment(line);
                if (tmp !== null) {
                    if (source === null) {
                        logger.error("Somehow, we have a line number comment without a file comment: ",
                            line);
                    } else {
                        if (tmp < currentFunction.initialLine) {
                            currentFunction.initialLine = tmp;
                        }
                        source = {file: source.file, line: tmp};
                    }
                }
            }

            if (currentFunction === null && line.match(this.beginFunction)) {
                inPrefix = false;
                currentFunction = {
                    lines: [],
                    initialLine: Infinity,
                    name: undefined,
                    file: undefined
                };
            }

            const functionName = line.match(this.definesFunction);
            if (functionName) {
                currentFunction.name = functionName[1];
            }

            if (filters.commentOnly && line.match(this.commentOnly)) return;

            const endOfSegment = line.match(this.endSegment);
            const shouldSkip = filters.directives && (
                endOfSegment ||
                line.match(this.dataDefn) ||
                line.match(this.definesGlobal) ||
                line.match(this.miscDirective) ||
                line.match(this.beginSegment));

            line = utils.expandTabs(line);
            const textAndSource = {
                text: this.filterAsmLine(line, filters),
                source: this.hasOpcode(line) ? source : null
            };
            if (currentFunction === null) {
                if (!shouldSkip) {
                    if (inPrefix) {
                        resultObject.prefix.push(textAndSource);
                    } else {
                        resultObject.postfix.push(textAndSource);
                    }
                }
            } else {
                if (!shouldSkip) {
                    currentFunction.lines.push(textAndSource);
                }
                if (endOfSegment) {
                    resultObject.functions.push(currentFunction);
                    currentFunction = null;
                }
            }
        });

        return this.resultObjectIntoArray(resultObject);
    }

    resultObjectIntoArray(obj) {
        let result = obj.prefix;

        obj.functions.sort((f1, f2) => {
            // order the main file above all others
            if (f1.file === null && f2.file !== null) {
                return -1;
            }
            if (f1.file !== null && f2.file === null) {
                return 1;
            }
            // order no-file below all others
            if (f1.file === undefined && f2.file !== undefined) {
                return 1;
            }
            if (f1.file !== undefined && f2.file === undefined) {
                return -1;
            }

            // if the files are the same, use line number ordering
            if (f1.file === f2.file) {
                // if the lines are the same as well, it's either:
                //   - two template instantiations, or
                //   - two compiler generated functions
                // order by name
                if (f1.initialLine === f2.initialLine) {
                    return f1.name.localeCompare(f2.name);
                } else {
                    return f1.initialLine - f2.initialLine;
                }
            }
            
            // else, order by file
            return f1.file.localeCompare(f2.file);
        });
        
        let firstLine = result.length === 0;
        for (const func of obj.functions) {
            if (!firstLine) {
                result.push({text: "", source: null});
            }
            for (const line of func.lines) {
                firstLine = false;
                result.push(line);
            }
        }

        for (const line of obj.postfix) {
            result.push(line);
        }

        return result;
    }
}

module.exports = AsmParser;
