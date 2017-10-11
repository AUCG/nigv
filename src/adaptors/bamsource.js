import {Ga4ghAlignmentReader} from './ga4gh/ga4ghalignmentreader';

export default class BamSource {
    constructor(igv, config) {
        this.config = config;
        this.alignmentContainer = undefined;
        this.maxRows = config.maxRows || 1000;

        if (config.sourceType === "ga4gh") {
            this.bamReader = new Ga4ghAlignmentReader(igv, config);
        }
        else {
            this.bamReader = new igv.BamReader(config);
        }

       this.viewAsPairs = config.viewAsPairs;
    };

	setViewAsPairs(bool) {
        var self = this;
        if (this.viewAsPairs !== bool) {
            this.viewAsPairs = bool;
            // TODO -- repair alignments
            if (this.alignmentContainer) {
                var alignmentContainer = this.alignmentContainer,
                    alignments;

                if (bool) {
                    alignments = _pairAlignments(alignmentContainer.packedAlignmentRows);
                }
                else {
                    alignments = _unpairAlignments(alignmentContainer.packedAlignmentRows);
                }
                alignmentContainer.packedAlignmentRows = _packAlignmentRows(alignments, alignmentContainer.start, alignmentContainer.end, self.maxRows);

            }
        }
    };

	getAlignments(chr, bpStart, bpEnd) {
        var self = this;
        return new Promise(function (fulfill, reject) {
            if (self.alignmentContainer && self.alignmentContainer.contains(chr, bpStart, bpEnd)) {
                fulfill(self.alignmentContainer);
            } else {
                self.bamReader.readAlignments(chr, bpStart, bpEnd).then(function (alignmentContainer) {
                    var maxRows = self.config.maxRows || 500,
                        alignments = alignmentContainer.alignments;

                    if (!self.viewAsPairs) {
                        alignments = _unpairAlignments([{alignments: alignments}]);
                    }

                    alignmentContainer.packedAlignmentRows = _packAlignmentRows(alignments, alignmentContainer.start, alignmentContainer.end, maxRows);

                    alignmentContainer.alignments = undefined;  // Don't need to hold onto these anymore
                    self.alignmentContainer = alignmentContainer;

                    igv.browser.genome.sequence.getSequence(alignmentContainer.chr, alignmentContainer.start, alignmentContainer.end).then(
                        function (sequence) {
                            if (sequence) {
                                alignmentContainer.coverageMap.refSeq = sequence;    // TODO -- fix this
                                alignmentContainer.sequence = sequence;           // TODO -- fix this
                                fulfill(alignmentContainer);
                            }
                        }).catch(reject);
                }).catch(reject);
            }
        });
    };

	_pairAlignments(rows) {
        var pairCache = {},
            result = [];

        rows.forEach(function (row) {

            row.alignments.forEach(function (alignment) {

                var pairedAlignment;

                if (_canBePaired(alignment)) {

                    pairedAlignment = pairCache[alignment.readName];
                    if (pairedAlignment) {
                        pairedAlignment.setSecondAlignment(alignment);
                        pairCache[alignment.readName] = undefined;   // Don't need to track this anymore.
                    }
                    else {
                        pairedAlignment = new igv.PairedAlignment(alignment);
                        pairCache[alignment.readName] = pairedAlignment;
                        result.push(pairedAlignment);
                    }
                }

                else {
                    result.push(alignment);
                }
            });
        });
        return result;
    }

	_unpairAlignments(rows) {
        var result = [];
        rows.forEach(function (row) {
            row.alignments.forEach(function (alignment) {
                if (alignment instanceof igv.PairedAlignment) {
                    if (alignment.firstAlignment) result.push(alignment.firstAlignment);  // shouldn't need the null test
                    if (alignment.secondAlignment) result.push(alignment.secondAlignment);

                }
                else {
                    result.push(alignment);
                }
            });
        });
        return result;
    }

	_canBePaired(alignment) {
        return alignment.isPaired() &&
            alignment.isMateMapped() &&
            alignment.chr === alignment.mate.chr &&
            (alignment.isFirstOfPair() || alignment.isSecondOfPair()) &&
            !(alignment.isSecondary() || alignment.isSupplementary());
    }

	_packAlignmentRows(alignments, start, end, maxRows) {
        if (!alignments) return;
        alignments.sort(function (a, b) {
            return a.start - b.start;
        });

        if (alignments.length === 0) {
            return [];
        } else {
            var bucketList = [],
                allocatedCount = 0,
                lastAllocatedCount = 0,
                nextStart = start,
                alignmentRow,
                index,
                bucket,
                alignment,
                alignmentSpace = 4 * 2,
                packedAlignmentRows = [],
                bucketStart = Math.max(start, alignments[0].start);

            alignments.forEach(function (alignment) {

                var buckListIndex = Math.max(0, alignment.start - bucketStart);
                if (bucketList[buckListIndex] === undefined) {
                    bucketList[buckListIndex] = [];
                }
                bucketList[buckListIndex].push(alignment);
            });

            while (allocatedCount < alignments.length && packedAlignmentRows.length < maxRows) {
                alignmentRow = new igv.BamAlignmentRow();
                while (nextStart <= end) {
                    bucket = undefined;
                    while (!bucket && nextStart <= end) {
                        index = nextStart - bucketStart;
                        if (bucketList[index] === undefined) {
                            ++nextStart;                     // No alignments at this index
                        } else {
                            bucket = bucketList[index];
                        }

                    } // while (bucket)

                    if (!bucket) {
                        break;
                    }
                    alignment = bucket.pop();
                    if (0 === bucket.length) {
                        bucketList[index] = undefined;
                    }

                    alignmentRow.alignments.push(alignment);
                    nextStart = alignment.start + alignment.lengthOnRef + alignmentSpace;
                    ++allocatedCount;

                } // while (nextStart)

                if (alignmentRow.alignments.length > 0) {
                    packedAlignmentRows.push(alignmentRow);
                }

                nextStart = bucketStart;

                if (allocatedCount === lastAllocatedCount) break;   // Protect from infinite loops

                lastAllocatedCount = allocatedCount;

            } // while (allocatedCount)

            return packedAlignmentRows;
        }
    }
}