export default class BamAlignmentRow {
	constructor() {
		this.alignments = [];
        this.score = undefined;
	}

	findCenterAlignment(bpStart, bpEnd) {
		let centerAlignment = undefined;

        // find single alignment that overlaps sort location
        this.alignments.forEach(function(a){
            if (undefined === centerAlignment) {
                if ((a.start + a.lengthOnRef) < bpStart || a.start > bpEnd) {
                    // do nothing
                } else {
                    centerAlignment = a;
                }
            }
        });

        return centerAlignment;
	}

	updateScore(genomicLocation, genomicInterval, sortOption) {
        this.score = this.calculateScore(genomicLocation, (1 + genomicLocation), genomicInterval, sortOption);
    };

    calculateScore(bpStart, bpEnd, interval, sortOption) {
    	let baseScore,
            baseScoreFirst,
            baseScoreSecond,
            alignment,
            blockFirst,
            blockSecond,
            block;

        alignment = this.findCenterAlignment(bpStart, bpEnd);
        if (undefined === alignment) {
            return Number.MAX_VALUE;
        }

        baseScoreFirst = baseScoreSecond = undefined;

        if ("NUCLEOTIDE" === sortOption.sort) {

            if (alignment.blocks && alignment.blocks.length > 0) {
                blockFirst = _blockAtGenomicLocation(alignment.blocks, bpStart, interval.start);
                if (blockFirst) {
                    baseScoreFirst = _blockScoreWithObject(blockFirst, interval);
                }
                // baseScoreFirst = _nucleotideBlockScores(alignment.blocks);
            }

            if (alignment.firstAlignment && alignment.firstAlignment.blocks && alignment.firstAlignment.blocks.length > 0) {
                blockFirst = _blockAtGenomicLocation(alignment.firstAlignment.blocks, bpStart, interval.start);
                if (blockFirst) {
                    baseScoreFirst = _blockScoreWithObject(blockFirst, interval);
                }
                // baseScoreFirst = _nucleotideBlockScores(alignment.firstAlignment.blocks);
            }

            if (alignment.secondAlignment && alignment.secondAlignment.blocks && alignment.secondAlignment.blocks.length > 0) {
                blockSecond = _blockAtGenomicLocation(alignment.secondAlignment.blocks, bpStart, interval.start);
                if (blockSecond) {
                    baseScoreSecond = _blockScoreWithObject(blockSecond, interval);
                }
                // baseScoreSecond = _nucleotideBlockScores(alignment.secondAlignment.blocks);
            }

            baseScore = (undefined === baseScoreFirst) ? baseScoreSecond : baseScoreFirst;

            return (undefined === baseScore) ? Number.MAX_VALUE : baseScore;
        } else if ("STRAND" === sortOption.sort) {

            return alignment.strand ? 1 : -1;
        } else if ("START" === sortOption.sort) {

            return alignment.start;
        }

        return Number.MAX_VALUE;
    }

    _blockAtGenomicLocation(blocks, genomicLocation, genomicIntervalStart) {
        var result = undefined;

        blocks.forEach(function (block) {
            for (let i = 0, genomicOffset = block.start - genomicIntervalStart, blockLocation = block.start, blockSequenceLength = block.seq.length;
                 i < blockSequenceLength;
                 i++, genomicOffset++, blockLocation++) {
                if (genomicLocation === blockLocation) {
                    result = { block: block, blockSeqIndex: i, referenceSequenceIndex: genomicOffset, location: genomicLocation };
                }
            }

        });
        return result;
	}

	_blockScoreWithObject(obj, interval) {
        var reference,
            base,
            coverage,
            count,
            phred;

        if ("*" === obj.block.seq) {
            return 3;
        }

        reference = interval.sequence.charAt(obj.referenceSequenceIndex);
        base = obj.block.seq.charAt(obj.blockSeqIndex);

        if ("=" === base) {
            base = reference;
        }

        if ('N' === base) {
            return 2;
        } else if (reference === base) {
            return 3;
        } else if ("X" === base|| reference !== base) {

            coverage = interval.coverageMap.coverage[ (obj.location - interval.coverageMap.bpStart) ];

            count = coverage[ "pos" + base ] + coverage[ "neg" + base ];
            phred = (coverage.qual) ? coverage.qual : 0;

            return -(count + (phred / 1000.0));
        }

        return undefined;
    }

    _nucleotideBlockScores(blocks) {

	    var result = undefined;

	    blocks.forEach(function (block) {

	        var sequence = interval.sequence,
	            coverageMap = interval.coverageMap,
	            reference,
	            base,
	            coverage,
	            count,
	            phred;

	        if ("*" === block.seq) {
	            result = 3;
	        }

	        for (let i = 0, indexReferenceSequence = block.start - interval.start, bpBlockSequence = block.start, lengthBlockSequence = block.seq.length;
	             i < lengthBlockSequence;
	             i++, indexReferenceSequence++, bpBlockSequence++) {

	            if (bpStart !== bpBlockSequence) {
	                continue;
	            }
	            reference = sequence.charAt(indexReferenceSequence);
	            base = block.seq.charAt(i);

	            if (base === "=") {
	                base = reference;
	            }

	            if (base === 'N') {
	                result = 2;
	            }
	            else if (base === reference) {
	                result = 3;
	            }
	            else if (base === "X" || base !== reference){
	                coverage = coverageMap.coverage[ (bpBlockSequence - coverageMap.bpStart) ];
	                count = coverage[ "pos" + base ] + coverage[ "neg" + base ];
	                phred = (coverage.qual) ? coverage.qual : 0;
	                result = -(count + (phred / 1000.0));
	            } else {
	                console.log("BamAlignmentRow.caculateScore - huh?");
	            }

	        } // for (i < lengthBlockSequence)

	    });
	}
}