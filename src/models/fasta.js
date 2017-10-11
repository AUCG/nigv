import {buildOptions} from '../utils/utils';
import {Chromosome, GenomicInterval} from '../models/genome';
import '../utils/exts';

const reservedProperties = new Set(['fastaURL', 'indexURL', 'cytobandURL', 'indexed']);

export default class FastaSequence {
    constructor(igv, reference) {
        this.igv = igv;
        this.file = reference.fastaURL;
        this.indexed = reference.indexed !== false;   // Indexed unless it explicitly is not
        if (this.indexed) {
            this.indexFile = reference.indexURL || reference.indexFile || this.file + ".fai";
        }
        this.withCredentials = reference.withCredentials;
        this.config = this._buildConfig(reference);
    }

    // Build a track-like config object from the referenceObject
    _buildConfig(reference) {
        let key, config = {};
        for (key in reference) {
            if (reference.hasOwnProperty(key) && !reservedProperties.has(key)) {
                config[key] = reference[key];
            }
        }
        return config;
    }

    init() {
        let self = this;
        if (self.indexed) {
            return new Promise(function (fulfill, reject) {
                self.getIndex().then(function (index) {
                    var order = 0;
                    self.chromosomes = {};
                    self.chromosomeNames.forEach(function (chrName) {
                        var bpLength = self.index[chrName].size;
                        self.chromosomes[chrName] = new Chromosome(chrName, order++, bpLength);
                    });
                    // Ignore index, getting chr names as a side effect.  Really bad practice
                    fulfill();
                }).catch(reject);
            });
        }
        else {
            return self.loadAll();
        }

    }

    getSequence(chr, start, end) {
        if (this.indexed) {
            return this._getSequenceIndexed.call(this, chr, start, end);
        }
        else {
            return this._getSequenceNonIndexed.call(this, chr, start, end);
        }
    }

    _getSequenceIndexed(chr, start, end) {
        var self = this;
        return new Promise(function (fulfill, reject) {
            var interval = self.interval;
            if (interval && interval.contains(chr, start, end)) {
                fulfill(getSequenceFromInterval(interval, start, end));
            }
            else {
                //console.log("Cache miss: " + (interval === undefined ? "nil" : interval.chr + ":" + interval.start + "-" + interval.end));
                // Expand query, to minimum of 100kb
                var qstart = start;
                var qend = end;
                if ((end - start) < 100000) {
                    var w = (end - start);
                    var center = Math.round(start + w / 2);
                    qstart = Math.max(0, center - 50000);
                    qend = center + 50000;
                }

                self.readSequence(chr, qstart, qend).then(function (seqBytes) {
                    self.interval = new GenomicInterval(chr, qstart, qend, seqBytes);
                    fulfill(getSequenceFromInterval(self.interval, start, end));
                }).catch(reject);
            }

            function getSequenceFromInterval(interval, start, end) {
                var offset = start - interval.start;
                var n = end - start;
                var seq = interval.features ? interval.features.substr(offset, n) : null;
                return seq;
            }
        });
    }


    _getSequenceNonIndexed(chr, start, end) {

        var self = this;

        return new Promise(function (fulfill, reject) {
            var seq = self.sequences[chr];
            if (seq && seq.length > end) {
                fulfill(seq.substring(start, end));
            }
        });

    }

    getIndex() {
        var self = this;
        return new Promise((fulfill, reject) => {
            if (self.index) {
                fulfill(self.index);
            } else {
                console.log()
                self.igv.xhr.load(self.indexFile, buildOptions(self.config))
                    .then(function (data) {
                        var lines = data.splitLines();
                        var len = lines.length;
                        var lineNo = 0;

                        self.chromosomeNames = [];     // TODO -- eliminate this side effect !!!!
                        self.index = {};               // TODO -- ditto
                        while (lineNo < len) {

                            var tokens = lines[lineNo++].split("\t");
                            var nTokens = tokens.length;
                            if (nTokens == 5) {
                                // Parse the index line.
                                var chr = tokens[0];
                                var size = parseInt(tokens[1]);
                                var position = parseInt(tokens[2]);
                                var basesPerLine = parseInt(tokens[3]);
                                var bytesPerLine = parseInt(tokens[4]);

                                var indexEntry = {
                                    size: size,
                                    position: position,
                                    basesPerLine: basesPerLine,
                                    bytesPerLine: bytesPerLine
                                };

                                self.chromosomeNames.push(chr);
                                self.index[chr] = indexEntry;
                            }
                        }

                        if (fulfill) {
                            fulfill(self.index);
                        }
                    })
                    .catch(reject);
            }
        });
    }

    loadAll() {
        var self = this;
        return new Promise(function (fulfill, reject) {
            self.chromosomeNames = [];
            self.chromosomes = {};
            self.sequences = {};

            self.igv.xhr.load(self.file, buildOptions(self.config))
                .then(function (data) {

                    var lines = data.splitLines(),
                        len = lines.length,
                        lineNo = 0,
                        nextLine,
                        currentSeq = "",
                        currentChr,
                        order = 0;

                    while (lineNo < len) {
                        nextLine = lines[lineNo++].trim();
                        if (nextLine.startsWith("#") || nextLine.length === 0) {
                            continue;
                        }
                        else if (nextLine.startsWith(">")) {
                            if (currentSeq) {
                                self.chromosomeNames.push(currentChr);
                                self.sequences[currentChr] = currentSeq;
                                self.chromosomes[currentChr] = new igv.Chromosome(currentChr, order++, currentSeq.length);
                            }
                            currentChr = nextLine.substr(1).split("\\s+")[0];
                            currentSeq = "";
                        }
                        else {
                            currentSeq += nextLine;
                        }
                    }

                    fulfill();

                })
                .catch(reject);
        });
    }

    readSequence(chr, qstart, qend) {
        //console.log("Read sequence " + chr + ":" + qstart + "-" + qend);
        var self = this;
        return new Promise(function (fulfill, reject) {
            self.getIndex().then(function () {
                var idxEntry = self.index[chr];
                if (!idxEntry) {
                    console.log("No index entry for chr: " + chr);

                    // Tag interval with null so we don't try again
                    self.interval = new GenomicInterval(chr, qstart, qend, null);
                    fulfill(null);
                } else {
                    var start = Math.max(0, qstart);    // qstart should never be < 0
                    var end = Math.min(idxEntry.size, qend);
                    var bytesPerLine = idxEntry.bytesPerLine;
                    var basesPerLine = idxEntry.basesPerLine;
                    var position = idxEntry.position;
                    var nEndBytes = bytesPerLine - basesPerLine;

                    var startLine = Math.floor(start / basesPerLine);
                    var endLine = Math.floor(end / basesPerLine);

                    var base0 = startLine * basesPerLine;   // Base at beginning of start line

                    var offset = start - base0;

                    var startByte = position + startLine * bytesPerLine + offset;

                    var base1 = endLine * basesPerLine;
                    var offset1 = end - base1;
                    var endByte = position + endLine * bytesPerLine + offset1 - 1;
                    var byteCount = endByte - startByte + 1;
                    if (byteCount <= 0) {
                        fulfill(null);
                    }

                    self.igv.xhr.load(self.file, buildOptions(self.config, {range: {start: startByte, size: byteCount}}))
                        .then(function (allBytes) {

                            var nBases,
                                seqBytes = "",
                                srcPos = 0,
                                desPos = 0,
                                allBytesLength = allBytes.length;

                            if (offset > 0) {
                                nBases = Math.min(end - start, basesPerLine - offset);
                                seqBytes += allBytes.substr(srcPos, nBases);
                                srcPos += (nBases + nEndBytes);
                                desPos += nBases;
                            }

                            while (srcPos < allBytesLength) {
                                nBases = Math.min(basesPerLine, allBytesLength - srcPos);
                                seqBytes += allBytes.substr(srcPos, nBases);
                                srcPos += (nBases + nEndBytes);
                                desPos += nBases;
                            }

                            fulfill(seqBytes);
                        })
                        .catch(reject)
                }
            }).catch(reject)
        });
    }
}