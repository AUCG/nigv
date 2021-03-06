import Ga4ghVariantReader from '../../adaptors/ga4gh/ga4ghvariantreader';
import {GenomicInterval} from '../genome';

var igv = null;
const MAX_GZIP_BLOCK_SIZE = (1 << 16);
export default class FeatureSource {
    /**
     * feature source for "bed like" files (tab delimited files with 1 feature per line: bed, gff, vcf, etc)
     *
     * @param config
     * @constructor
     */
    constructor(igvInstance, config) {
        igv = igvInstance;
        this.config = config || {};

        this.sourceType = (config.sourceType === undefined ? "file" : config.sourceType);

        if (config.sourceType === "ga4gh") {
            this.reader = new Ga4ghVariantReader(igv, config);
        } else if (config.sourceType === "immvar") {
            this.reader = new igv.ImmVarReader(config);
        } else if (config.type === "eqtl") {
            if (config.sourceType === "gtex-ws") {
                this.reader = new igv.GtexReader(config);
            }
            else {
                this.reader = new igv.GtexFileReader(config);
            }
        } else if (config.sourceType === "bigquery") {
            this.reader = new igv.BigQueryFeatureReader(config);
        } else if (config.source !== undefined) {
            this.reader = new igv.CustomServiceReader(config.source);
        }
        else {
            // Default for all sorts of ascii tab-delimited file formts
            this.reader = new igv.FeatureFileReader(config);
        }
        this.visibilityWindow = config.visibilityWindow;

    }

    getFileHeader () {
        var self = this,
            maxRows = this.config.maxRows || 500;

        return new Promise(function (fulfill, reject) {

            if (self.header) {
                fulfill(self.header);
            } else {
                if (typeof self.reader.readHeader === "function") {

                    self.reader.readHeader().then(function (header) {
                        // Non-indexed readers will return features as a side effect.  This is an important,
                        // if unfortunate, performance hack
                        if (header) {
                            var features = header.features;
                            if (features) {

                                if ("gtf" === self.config.format || "gff3" === self.config.format || "gff" === self.config.format) {
                                    features = (new igv.GFFHelper(self.config.format)).combineFeatures(features);
                                }

                                // Assign overlapping features to rows

                                this._packFeatures(features, maxRows);
                                self.featureCache = new igv.FeatureCache(features);

                                // If track is marked "searchable"< cache features by name -- use this with caution, memory intensive
                                if (self.config.searchable) {
                                    this._addFeaturesToDB(features);
                                }
                            }
                        }

                        if (header && header.format) {
                            self.config.format = header.format;
                        }

                        fulfill(header);
                    }).catch(reject);
                }
                else {
                    fulfill(null);
                }
            }
        });
    }

    _addFeaturesToDB(featureList) {
        var echo = [];
        featureList.forEach(function (feature) {
            if (feature.name) {
                igv.browser.featureDB[feature.name.toUpperCase()] = feature;
            }
        });
        // _.each(igv.browser.featureDB, function(item){
        //     console.log('name ' + item.name);
        // });
        // console.log('yo');
    }


    /**
     * Required function fo all data source objects.  Fetches features for the
     * range requested and passes them on to the success function.  Usually this is
     * a function that renders the features on the canvas
     *
     * @param chr
     * @param bpStart
     * @param bpEnd
     * @param bpPerPixel
     */

    getFeatures(chr, bpStart, bpEnd, bpPerPixel) {

        var self = this;
        return new Promise(function (fulfill, reject) {

            var genomicInterval,
                featureCache,
                maxRows,
                str;

            genomicInterval = new GenomicInterval(chr, bpStart, bpEnd);
            featureCache = self.featureCache;
            maxRows = self.config.maxRows || 500;
            str = chr.toLowerCase();

            if ("all" === str) {
                if (self.reader.supportsWholeGenome) {
                    if (featureCache && featureCache.range === undefined) {
                        fulfill(this._getWGFeatures(featureCache.allFeatures()));
                    }
                    else {
                        self.reader
                            .readFeatures(chr)
                            .then(function (featureList) {
                            if (featureList && typeof featureList.forEach === 'function') {  // Have result AND its an array type
                                if ("gtf" === self.config.format || "gff3" === self.config.format || "gff" === self.config.format) {
                                    featureList = (new igv.GFFHelper(self.config.format)).combineFeatures(featureList);
                                }
                                self.featureCache = new igv.FeatureCache(featureList);   // Note - replacing previous cache with new one

                                // Assign overlapping features to rows
                                this._packFeatures(featureList, maxRows);
                            }
                            fulfill(this._getWGFeatures(self.featureCache.allFeatures()));
                        });
                    }
                } else {
                    fulfill(null);
                }
            }

            else if (featureCache && (featureCache.range === undefined || featureCache.range.containsRange(genomicInterval))) {
                fulfill(self.featureCache.queryFeatures(chr, bpStart, bpEnd));
            }
            else {
                // TODO -- reuse cached features that overelap new region

                if (self.sourceType === 'file' && (self.visibilityWindow === undefined || self.visibilityWindow <= 0)) {
                    // Expand genomic interval to grab entire chromosome
                    genomicInterval.start = 0;
                    var chromosome = igv.browser ? igv.browser.genome.getChromosome(chr) : undefined;
                    genomicInterval.end = (chromosome === undefined ? Number.MAX_VALUE : chromosome.bpLength);
                }

                self.reader.readFeatures(chr, genomicInterval.start, genomicInterval.end).then(
                    function (featureList) {

                        if (featureList && typeof featureList.forEach === 'function') {  // Have result AND its an array type

                            var isQueryable = self.reader.indexed || self.config.sourceType !== "file";

                            if ("gtf" === self.config.format || "gff3" === self.config.format || "gff" === self.config.format) {
                                featureList = (new igv.GFFHelper(self.config.format)).combineFeatures(featureList);
                            }

                            self.featureCache = isQueryable ?
                                new igv.FeatureCache(featureList, genomicInterval) :
                                new igv.FeatureCache(featureList);   // Note - replacing previous cache with new one


                            // Assign overlapping features to rows
                            this._packFeatures(featureList, maxRows);

                            // If track is marked "searchable"< cache features by name -- use this with caution, memory intensive
                            if (self.config.searchable) {
                                this._addFeaturesToDB(featureList);
                            }

                            // Finally pass features for query interval to continuation
                            fulfill(self.featureCache.queryFeatures(chr, bpStart, bpEnd));
                        }
                        else {
                            fulfill(null);
                        }

                    }).catch(reject);
            }
        });
    }

    _packFeatures(features, maxRows) {

        if (features == null || features.length === 0) {
            return;
        }

        // Segregate by chromosome

        var chrFeatureMap = {},
            chrs = [];
        features.forEach(function (feature) {

            var chr = feature.chr,
                flist = chrFeatureMap[chr];

            if (!flist) {
                flist = [];
                chrFeatureMap[chr] = flist;
                chrs.push(chr);
            }

            flist.push(feature);
        });

        // Loop through chrosomosomes and pack features;

        chrs.forEach(function (chr) {

            pack(chrFeatureMap[chr], maxRows);
        });


        // Assigns a row # to each feature.  If the feature does not fit in any row and #rows == maxRows no
        // row number is assigned.
        function pack(featureList, maxRows) {

            var rows = [];

            featureList.sort(function (a, b) {
                return a.start - b.start;
            })


            rows.push(-1000);
            featureList.forEach(function (feature) {

                var i,
                    r,
                    len = Math.min(rows.length, maxRows),
                    start = feature.start;

                for (r = 0; r < len; r++) {
                    if (start >= rows[r]) {
                        feature.row = r;
                        rows[r] = feature.end;
                        return;
                    }
                }
                feature.row = r;
                rows[r] = feature.end;


            });
        }
    }


    _getWGFeatures(features) {

        var wgFeatures;

        wgFeatures = _.map(features, function(f) {

            var wg;

            wg = (JSON.parse(JSON.stringify(f)));
            wg.start = igv.browser.genome.getGenomeCoordinate(f.chr, f.start);
            wg.end = igv.browser.genome.getGenomeCoordinate(f.chr, f.end);

            return wg;

        });

        // features.forEach(function (f) {
        //     var wgStart,
        //         wgEnd,
        //         wgFeature;
        //
        //     wgStart = igv.browser.genome.getGenomeCoordinate(f.chr, f.start);
        //     wgEnd = igv.browser.genome.getGenomeCoordinate(f.chr, f.end);
        //
        //     wgFeature = (JSON.parse(JSON.stringify(f)));
        //
        //     wgFeature.start = wgStart;
        //     wgFeature.end = wgEnd;
        //
        //     wgFeatures.push(wgFeature);
        // });

        return wgFeatures;
    }
}