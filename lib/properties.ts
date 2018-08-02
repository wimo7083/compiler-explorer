// Copyright (c) 2012, Matt Godbolt
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright notice,
//       this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

import {logger} from './logger';
import * as fs from 'fs-extra';
import * as _ from 'underscore';
import * as path from 'path';

import {CELanguage_t, CELanguages_t} from "./languages";

type CEProperty = string | number | boolean;
type CEProperties = { [id: string]: CEProperty };

let properties: { [id: string]: CEProperties } = {};

let hierarchy: string[] = [];

let propDebug = false;

function findProps(base: string, elem: string): CEProperties {
    const name = base + '.' + elem;
    return properties[name];
}

function debug(string: string) {
    if (propDebug) logger.info(`prop: ${string}`);
}

function get(base: string, property: string, defaultValue?: any): CEProperty {
    let result = defaultValue;
    let source = 'default';
    hierarchy.forEach((elem: string) => {
        const propertyMap = findProps(base, elem);
        if (propertyMap && property in propertyMap) {
            debug(`${base}.${property}: overriding ${source} value (${result}) with ${propertyMap[property]}`);
            result = propertyMap[property];
            source = elem;
        }
    });
    debug(`${base}.${property}: returning ${result} (from ${source})`);
    return result;
}

function toProperty(prop: string): CEProperty {
    if (prop === 'true' || prop === 'yes') return true;
    if (prop === 'false' || prop === 'no') return false;
    if (prop.match(/^-?(0|[1-9][0-9]*)$/)) return parseInt(prop);
    if (prop.match(/^-?[0-9]*\.[0-9]+$/)) return parseFloat(prop);
    return prop;
}

function parseProperties(blob: string, name: string): CEProperties {
    const props: CEProperties = {};
    blob.split('\n').forEach((line: string, index: number) => {
        line = line.replace(/#.*/, '').trim();
        if (!line) return;
        let split = line.match(/([^=]+)=(.*)/);
        if (!split) {
            logger.error(`Bad line: ${line} in ${name}: ${index + 1}`);
            return;
        }
        props[split[1].trim()] = toProperty(split[2].trim());
        debug(`${split[1].trim()} = ${split[2].trim()}`);
    });
    return props;
}

function initialize(directory: string, hier: string[]) {
    if (hier === null) throw new Error('Must supply a hierarchy array');
    hierarchy = _.map(hier, x => x.toLowerCase());
    logger.info(`Reading properties from ${directory} with hierarchy ${hierarchy}`);
    const endsWith = /\.properties$/;
    const propertyFiles = fs.readdirSync(directory).filter(filename => filename.match(endsWith));
    properties = {};
    propertyFiles.forEach(file => {
        const baseName = file.replace(endsWith, '');
        file = path.join(directory, file);
        debug('Reading config from ' + file);
        properties[baseName] = parseProperties(fs.readFileSync(file, 'utf-8'), file);
    });
    logger.debug("props.properties = ", properties);
}

function propsFor(base: string) {
    return function (property: string, defaultValue?: any) {
        return get(base, property, defaultValue);
    };
}

type propsFn_t = typeof propsFor;

// function mappedOf(fn, funcA, funcB) {
//     const resultA = funcA();
//     if (resultA !== undefined) return resultA;
//     return funcB();
// }

/***
 * Compiler property fetcher
 */

export type ceProps_t = (id: string, def?:any) => CEProperty;

class CompilerProps {
    /***
     * Creates a CompilerProps lookup function
     *
     * @param {CELanguages} languages - Supported languages
     * @param {function} ceProps - propsFor function to get Compiler Explorer values from
     */
    languages: CELanguages_t;
    ceProps: ceProps_t;
    propsByLangId: {[id: string]: propsFn_t};
    constructor(languages:CELanguages_t, ceProps: ceProps_t) {
        this.languages = languages;
        this.propsByLangId = {};

        this.ceProps = ceProps;

        // Instantiate a function to access records concerning the chosen language in hidden object props.properties
        _.each(this.languages, lang => this.propsByLangId[lang.id] = propsFor(lang.id));
    }

    $getInternal(langId, key, defaultValue) {
        const languagePropertyValue = this.propsByLangId[langId](key);
        if (languagePropertyValue !== undefined) {
            return languagePropertyValue;
        }
        return this.ceProps(key, defaultValue);
    }

    /***
     * Gets a value for a given key associated to the given languages from the properties
     *
     * @param {?(string|CELanguages)} langs - Which langs to search in
     *  For compatibility, {null} means looking into the Compiler Explorer properties (Not on any language)
     *  If langs is a {string}, it refers to the language id we want to search into
     *  If langs is a {CELanguages}, it refers to which languages we want to search into
     *  TODO: Add a {Language} version?
     * @param {string} key - Key to look for
     * @param {*} defaultValue - What to return if the key is not found
     * @param {?function} fn - Transformation to give to each value found
     * @returns {*} Transformed value(s) found or fn(defaultValue)
     */
    get(langs: null | string | CELanguage_t | CELanguages_t, key: string, defaultValue?: any, fn: (...args: any[]) => any = _.identity) {
        fn = fn || _.identity;
        if (_.isEmpty(langs)) {
            return fn(this.ceProps(key, defaultValue));
        }
        if (!_.isString(langs)) {
            return _.chain(langs)
                .map((lang: CELanguage_t) => [lang.id, fn(this.$getInternal(lang.id, key, defaultValue), lang)])
                .object()
                .value();
        } else {
            if (this.propsByLangId[langs]) {
                return fn(this.$getInternal(langs, key, defaultValue), this.languages[langs]);
            } else {
                logger.error(`Tried to pass ${langs} as a language ID`);
                return fn(defaultValue);
            }
        }
    }
}

module.exports = {
    get: get,
    propsFor: propsFor,
    initialize: initialize,
    CompilerProps: CompilerProps,
    setDebug: debug => {
        propDebug = debug;
    },
    fakeProps: fake => (prop, def) => fake[prop] === undefined ? def : fake[prop]
};
