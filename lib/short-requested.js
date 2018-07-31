// Copyright (c) 2018, Compiler Explorer Authors
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

const google = require('./google'),
    url = require('url'),
    logger = require('./logger').logger,
    lzstring = require('lz-string'),
    rison = require('rison-node');

class ShortRequested {
    constructor(compilerProps, aws) {
        this.shortUrlResolver = new google.ShortLinkResolver(aws.getConfig('googleApiKey'));
        this.shortUrlResolver = {resolve: (url) => Promise.resolve({longUrl: url})};
        this.allowedShortHostsRe = new RegExp(compilerProps.ceProps('allowedShortUrlHostRe'));
    }


    getShortnerUrl(bit) {
        return `http://goo.gl/${encodeURIComponent(bit)}`;
    }

    getGoogleUrl(req) {
        const bits = req.url.split("/");
        if (bits.length !== 2 || req.method !== "GET") {
            return null;
        }
        return this.getShortnerUrl(bits[1]);
    }

    shortPathHandler(req, res, next) {
        const googleUrl = this.getGoogleUrl(req);
        if (!googleUrl) {
            return next();
        }
        this.shortUrlResolver.resolve(googleUrl)
            .then(resultObj => {
                const parsed = url.parse(resultObj.longUrl);

                if (parsed.hostname.match(this.allowedShortHostsRe) === null) {
                    logger.warn(`Denied access to short URL ${req.url} - linked to ${resultObj.longUrl}`);
                    return next();
                }
                res.writeHead(301, {
                    Location: resultObj.id,
                    'Cache-Control': 'public'
                });
                res.end();
            })
            .catch(e => {
                logger.error(`Failed to expand ${googleUrl} - ${e}`);
                next();
            });
    }

    loadState(state) {
        return state;
    }

    risonify(obj) {
        return rison.quote(rison.encode_object(obj));
    }

    unrisonify(text) {
        return rison.decode_object(decodeURIComponent(text.replace(/\+/g, '%20')));
    }

    deserialiseState(stateText) {
        logger.info(`Deserialazing ${stateText}`);
        let state;
        let exception;
        try {
            state = this.unrisonify(stateText);
            logger.info(state);
            if (state && state.z) {
                state = this.unrisonify(lzstring.decompressFromBase64(state.z));
            }
        } catch (ex) {
            exception = ex;
        }

        if (!state) {
            try {
                state = JSON.parse(decodeURIComponent(stateText));
            } catch (ex) {
                if (!exception) exception = ex;
            }
        }
        logger.info(`${state}, ${exception}`);
        if (!state && exception) throw exception;
        return this.loadState(state);
    }

    configEmbedder(req) {
        if (req.query.s) {
            const googleUrl = decodeURIComponent(req.params.s);
            return this.shortUrlResolver
                .resolve(googleUrl)
                .then(resultObj => {
                    resultObj.longUrl = decodeURIComponent(req.query.s);
                    const parsed = url.parse(resultObj.longUrl);

                    if (parsed.hostname.match(this.allowedShortHostsRe) !== null) {
                        logger.warn(`Denied access to short URL ${req.url} - linked to ${resultObj.longUrl}`);
                        return {};
                    }
                    logger.info(parsed.hash);
                    const state = this.deserialiseState(parsed.hash.substr(1));
                    logger.info(`Stored state was: ${state}`);
                    return state;
                })
                .catch(e => {
                    logger.error(`Failed to expand ${googleUrl} - ${e}`);
                    return {};
                });
        } else {
            logger.info('No s param');
            return Promise.resolve({});
        }
    }
}

module.exports = ShortRequested;
