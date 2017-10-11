export function ga4ghGet(igv, options) {
    var url = options.url + "/" + options.entity + "/" + options.entityId + "/";
    return igv.xhr.loadJson(url, options);      // Returns a promise
}

export function ga4ghSearch(igv, options) {
    return new Promise(function (fulfill, reject) {
        var results = options.results ? options.results : [],
            url = options.url,
            body = options.body,
            decode = options.decode,
            // apiKey = oauth.google.apiKey,
            paramSeparator = "?",
            fields = options.fields;  // Partial response

        // if (apiKey) {
        //     url = url + paramSeparator + "key=" + apiKey;
        //     paramSeparator = "&";
        // }

        if (fields) {
            url = url + paramSeparator + "fields=" + fields;
        }

        // Start the recursive load cycle.  Data is fetched in chunks, if more data is available a "nextPageToken" is returned.
        loadChunk();

        function loadChunk(pageToken) {

            if (pageToken) {
                body.pageToken = pageToken;
            }
            else {
                if (body.pageToken != undefined) delete body.pageToken;    // Remove previous page token, if any
            }

            options.sendData = JSON.stringify(body);

            igv.xhr.loadJson(url, options).then(function (json) {
                var nextPageToken, tmp;

                if (json) {

                    tmp = decode ? decode(json) : json;

                    if (tmp) {

                        tmp.forEach(function (a) {
                            var keep = true;           // TODO -- conditionally keep (downsample)
                            if (keep) {
                                results.push(a);
                            }
                        });
                    }


                    nextPageToken = json["nextPageToken"];

                    if (nextPageToken) {
                        loadChunk(nextPageToken);
                    }
                    else {
                        fulfill(results);
                    }
                }
                else {
                    fulfill(results);
                }

            }).catch(function (error) {
                reject(error);
            });
        }

    });
}

export function ga4ghSearchReadGroupSets(igv, options) {
    ga4ghSearch(igv, {
        url: options.url + "/readgroupsets/search/",
        body: {
            "datasetIds": [options.datasetId],

            "pageSize": "10000"
        },
        decode: function (json) {
            return json.readGroupSets;
        }
    }).then(function (results) {
        options.success(results);
    }).catch(function (error) {
        console.log(error);
    });
}

export function ga4ghSearchVariantSets(igv, options) {
    ga4ghSearch(igv, {
        url: options.url + "/variantsets/search/",
        body: {
            "datasetIds": [options.datasetId],
            "pageSize": "10000"
        },
        decode: function (json) {
            return json.variantSets;
        }
    }).then(function (results) {
        options.success(results);
    }).catch(function (error) {
        console.log(error);
    });
}

export function ga4ghSearchCallSets(igv, options) {
    // When searching by dataset id, first must get variant sets.
    if (options.datasetId) {
        ga4ghSearchVariantSets(igv, {
            url: options.url,
            datasetId: options.datasetId,
            success: function (results) {

                var variantSetIds = [];
                results.forEach(function (vs) {
                    variantSetIds.push(vs.id);
                });

                // Substitute variantSetIds for datasetId
                options.datasetId = undefined;
                options.variantSetIds = variantSetIds;
                ga4ghSearchCallSets(igv, options);
            }
        });
    }
    else {
        ga4ghSearch(igv, {
            url: options.url + "/callsets/search/",
            body: {
                "variantSetIds": options.variantSetIds,
                "pageSize": "10000"
            },
            decode: function (json) {

                if (json.callSets) json.callSets.forEach(function (cs) {
                    cs.variantSetIds = options.variantSetIds;
                });

                return json.callSets;
            }
        }).then(function (results) {
            options.success(results);
        }).catch(function (error) {
            console.log(error);
        });
    }
}


/**
 * Method to support ga4gh application
 *
 * @param options
 */
export function ga4ghSearchReadAndCallSets(igv, options) {
    ga4ghSearchReadGroupSets(igv, {
        url: options.url,
        datasetId: options.datasetId,
        success: function (readGroupSets) {
            ga4ghSearchCallSets(igv, {
                url: options.url,
                datasetId: options.datasetId,
                success: function (callSets) {

                    // Merge call sets and read group sets

                    var csHash = {};
                    callSets.forEach(function (cs) {
                        csHash[cs.name] = cs;
                    });

                    var mergedResults = [];
                    readGroupSets.forEach(function (rg) {
                        var m = {readGroupSetId: rg.id, name: rg.name, datasetId: options.datasetId},
                            cs = csHash[rg.name];
                        if (cs) {
                            m.callSetId = cs.id;
                            m.variantSetIds = cs.variantSetIds;
                        }
                        mergedResults.push(m);
                    });

                    options.success(mergedResults);

                }
            });
        }
    });
}