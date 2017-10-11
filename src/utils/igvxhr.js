import * as _ from 'underscore';
import GeneDock from './genedock';
import {unbgzf} from './bgzf';

// Compression types
const NONE = 0;
const GZIP = 1;
const BGZF = 2;

export class AbortLoad {}

export class igvXHR {
    constructor(config){
        this.config = config;
    }

    load(url, options) {
        if (!options) options = {};
        // if (!options.oauthToken) {
        //     return applyOauthToken();
        // }
        // var token = _.isFunction(options.oauthToken) ? options.oauthToken() : options.oauthToken;
        // if (token.then && _.isFunction(token.then)) {
        //     return token.then(applyOauthToken);
        // }
        // return applyOauthToken(token);
        // //////////

        // function applyOauthToken(token) {
        //     if (token) {
        //         options.token = token;
        //     }

        //     return this._getLoadPromise(url, options);
        // }
        return this._getLoadPromise(url, options);
    }

    _getLoadPromise(url, options) {
        return new Promise((fullfill, reject) => {
            var xhr = new XMLHttpRequest(),
                sendData = options.sendData || options.body,
                method = options.method || (sendData ? "POST" : "GET"),
                range = options.range,
                responseType = options.responseType,
                contentType = options.contentType,
                mimeType = options.mimeType,
                headers = options.headers || {},
                isSafari = navigator.vendor.indexOf("Apple") == 0 && /\sSafari\//.test(navigator.userAgent),
                withCredentials = options.withCredentials,
                header_keys, key, value, i;

            if (options.token) {
                headers["Authorization"] = 'Bearer ' + options.token;
            }

            if(options.oauth) {
                // "Legacy" option -- do not use (use options.token)
                this._addOauthHeaders(headers)
            }

            if (range) {
                // Hack to prevent caching for byte-ranges. Attempt to fix net:err-cache errors in Chrome
                url += url.includes("?") ? "&" : "?";
                url += "someRandomSeed=" + Math.random().toString(36);
            }

            // TODO: 判断请求是否发向genedock
            if(url.match('genedock')){
                const gd = new GeneDock();
                headers = gd.addGeneDockHeaders(url, options, this.config);
            }

            xhr.open(method, url);
            if (range) {
                var rangeEnd = range.size ? range.start + range.size - 1 : "";
                xhr.setRequestHeader("Range", "bytes=" + range.start + "-" + rangeEnd);
                //      xhr.setRequestHeader("Cache-Control", "no-cache");    <= This can cause CORS issues, disabled for now
            }
            if (contentType) {
                xhr.setRequestHeader("Content-Type", contentType);
            }
            if (mimeType) {
                xhr.overrideMimeType(mimeType);
            }
            if (responseType) {
                xhr.responseType = responseType;
            }
            if (headers) {
                header_keys = Object.keys(headers);
                for (i = 0; i < header_keys.length; i++) {
                    key = header_keys[i];
                    value = headers[key];
                    // console.log("Adding to header: " + key + "=" + value);
                    xhr.setRequestHeader(key, value);
                }
            }


            // NOTE: using withCredentials with servers that return "*" for access-allowed-origin will fail
            if (withCredentials === true) {
                xhr.withCredentials = true;
            }

            xhr.onload = function (event) {
                // when the url points to a local file, the status is 0 but that is no error
                if (xhr.status == 0 || (xhr.status >= 200 && xhr.status <= 300)) {

                    if (range && xhr.status != 206) {
                        handleError("ERROR: range-byte header was ignored for url: " + url);
                    }
                    else {
                        fullfill(xhr.response);
                    }
                }
                else {

                    //
                    if (xhr.status === 416) {
                        //  Tried to read off the end of the file.   This shouldn't happen, but if it does return an
                        handleError("Unsatisfiable range");
                    }
                    else {// TODO -- better error handling
                        handleError(xhr.status);
                    }

                }

            };

            xhr.onerror = function (event) {

                if (this._isCrossDomain(url) && !options.crossDomainRetried &&
                    igv.browser &&
                    igv.browser.crossDomainProxy &&
                    url != igv.browser.crossDomainProxy) {

                    options.sendData = "url=" + url;
                    options.crossDomainRetried = true;

                    this.load(igv.browser.crossDomainProxy, options).then(fullfill);
                }
                else {
                    handleError("Error accessing resource: " + url + " Status: " + xhr.status);
                }
            }


            xhr.ontimeout = function (event) {
                handleError("Timed out");
            };

            xhr.onabort = function (event) {
                console.log("Aborted");
                reject(new AbortLoad());
            };

            try {
                xhr.send(sendData);
            } catch (e) {
                reject(e);
            }


            function handleError(message) {
                if (reject) {
                    reject(new Error(message));
                }
                else {
                    throw new Error(message);
                }
            }
        });
    }

    loadArrayBuffer(url, options) {

        if (url instanceof File) {
            return this._loadFileSlice(url, options);
        } else {
            if (options === undefined) options = {};
            options.responseType = "arraybuffer";
            return this.load(url, options);
        }
    }

    loadJson(url, options) {

        var method = options.method || (options.sendData ? "POST" : "GET");

        // if (method == "POST") options.contentType = 'application/json; charset=UTF-8';
        options.contentType = 'application/json; charset=UTF-8';

        return new Promise((fullfill, reject) => {
            this.load(url, options).then(
                function (result) {
                    if (result) {
                        fullfill(JSON.parse(result));
                    }
                    else {
                        fullfill(result);
                    }
                }).catch(reject);
        })
    }

    loadString(path, options) {
        if (path instanceof File) {
            return _loadFileHelper(path, options);
        } else {
            return this._loadURLHelper(path, options);
        }
    }

    arrayBufferToString(arraybuffer, compression) {

        var plain, inflate;

        if (compression === GZIP) {
            inflate = new Zlib.Gunzip(new Uint8Array(arraybuffer));
            plain = inflate.decompress();
        }
        else if (compression === BGZF) {
            plain = new Uint8Array(igv.unbgzf(arraybuffer));
        }
        else {
            plain = new Uint8Array(arraybuffer);
        }

        var result = "";
        for (var i = 0, len = plain.length; i < len; i++) {
            result = result + String.fromCharCode(plain[i]);
        }
        return result;
    }

    _arrayBufferToBits(arraybuffer, compression) {

        var plain,
            inflate;

        if (compression === GZIP) {
            inflate = new Zlib.Gunzip(new Uint8Array(arraybuffer));
            plain = inflate.decompress();
        } else if (compression === BGZF) {
            plain = new Uint8Array(igv.unbgzf(arraybuffer));
        } else {
            plain = new Uint8Array(arraybuffer);
        }

        return plain;
    }

    _loadFileSlice(localfile, options) {
        return new Promise(function (fullfill, reject) {
            let fileReader,
                blob,
                rangeEnd;

            fileReader = new FileReader();

            fileReader.onload = function (e) {

                var compression,
                    result;

                if (options.bgz) {
                    compression = BGZF;
                } else if (localfile.name.endsWith(".gz")) {
                    compression = GZIP;
                } else {
                    compression = NONE;
                }

                // result = igvxhr.arrayBufferToString(fileReader.result, compression);
                // console.log('loadFileSlice byte length ' + fileReader.result.byteLength);

                fullfill(fileReader.result);

            };

            fileReader.onerror = function (e) {
                console.log("reject uploading local file " + localfile.name);
                reject(null, fileReader);
            };

            if (options.range) {
                rangeEnd = options.range.start + options.range.size - 1;
                blob = localfile.slice(options.range.start, rangeEnd + 1);
                fileReader.readAsArrayBuffer(blob);
            } else {
                fileReader.readAsArrayBuffer(localfile);
            }

        });
    }

    _loadFileHelper(localfile, options) {
        return new Promise(function (fullfill, reject) {
            var fileReader = new FileReader();
            fileReader.onload = function (e) {
                var compression,
                    result;

                if (options.bgz) {
                    compression = BGZF;
                } else if (localfile.name.endsWith(".gz")) {
                    compression = GZIP;
                } else {
                    compression = NONE;
                }

                result = this.arrayBufferToString(fileReader.result, compression);

                fullfill(result);
            };

            fileReader.onerror = function (e) {
                console.log("reject uploading local file " + localfile.name);
                reject(null, fileReader);
            };

            fileReader.readAsArrayBuffer(localfile);

        });
    }

    _loadURLHelper(url, options) {
        var compression,
            fn,
            idx;

        if (options === undefined) options = {};

        // Strip parameters from path
        // TODO -- handle local files with ?
        idx = url.indexOf("?");
        fn = idx > 0 ? url.substring(0, idx) : url;

        if (options.bgz) {
            compression = BGZF;
        } else if (fn.endsWith(".gz")) {
            compression = GZIP;
        } else {
            compression = NONE;
        }

        if (compression === NONE) {
            options.mimeType = 'text/plain; charset=x-user-defined';
            return this.load(url, options);
        } else {
            options.responseType = "arraybuffer";

            return new Promise(function (fullfill, reject) {
                this.load(url, options)
                    .then(
                        function (data) {
                            var result = this.arrayBufferToString(data, compression);
                            fullfill(result);
                        })
                    .catch(reject)
            })
        }
    }

    _isCrossDomain(url) {
        var origin = window.location.origin;
        return !url.startsWith(origin);
    }

    /**
     * Legacy method to add oauth tokens.  Kept for backward compatibility.  Do not use -- use config.token setting instead.
     * @param headers
     * @returns {*}
     */
    _addOauthHeaders(headers) {
        headers["Cache-Control"] = "no-cache";
        var acToken = oauth.google.access_token;       // TODO -- generalize
        if (acToken && !headers.hasOwnProperty("Authorization")) {
            headers["Authorization"] = "Bearer " + acToken;
        }
        return headers;
    }
}