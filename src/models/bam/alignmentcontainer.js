import DownsampleBucket from './utils/downsamplebucket';
import CoverageMap from './utils/coveragemap';
import DownsampledInterval from './utils/downsampledinterval';

export default class AlignmentContainer {
	constructor(chr, start, end, samplingWindowSize, samplingDepth, pairsSupported) {
		this.chr = chr;
        this.start = start;
        this.end = end;
        this.length = (end - start);

        this.coverageMap = new CoverageMap(chr, start, end);
        console.log(this.coverageMap);
        this.alignments = [];
        this.downsampledIntervals = [];

        this.samplingWindowSize = samplingWindowSize === undefined ? 100 : samplingWindowSize;
        this.samplingDepth = samplingDepth === undefined ? 50 : samplingDepth;

        this.pairsSupported = pairsSupported;
        this.paired = false;  // false until proven otherwise
        this.pairsCache = {};  // working cache of paired alignments by read name

        this.downsampledReads = new Set();

        this.currentBucket = new DownsampleBucket(this.start, this.start + this.samplingWindowSize, this);
	}

	// TODO -- pass this in
	filter(alignment) {
        return alignment.isMapped() && !alignment.isFailsVendorQualityCheck();
    }

	push(alignment) {
		if (this.filter(alignment) === false) return;

        this.coverageMap.incCounts(alignment);   // Count coverage before any downsampling

        if (this.pairsSupported && this.downsampledReads.has(alignment.readName)) {
            return;   // Mate already downsampled -- pairs are treated as a single alignment for downsampling
        }

        if (alignment.start >= this.currentBucket.end) {
            finishBucket.call(this);
            this.currentBucket = new DownsampleBucket(alignment.start, alignment.start + this.samplingWindowSize, this);
        }

        this.currentBucket.addAlignment(alignment);
	}

	forEach(callback) {
		this.alignments.forEach(callback);
	}

	finish() {
		if (this.currentBucket !== undefined) {
            finishBucket.call(this);
        }

        // Need to remove partial pairs whose mate was downsampled
        if(this.pairsSupported) {
            var tmp = [], ds = this.downsampledReads;

            this.alignments.forEach(function (a) {
                if (!ds.has(a.readName)) {
                    tmp.push(a);
                }
            })
            this.alignments = tmp;
        }

        this.alignments.sort(function (a, b) {
            return a.start - b.start
        });

        this.pairsCache = undefined;
        this.downsampledReads = undefined;
	}

	contains(chr, start, end) {
		return this.chr == chr && this.start <= start && this.end >= end;
	}

	hasDownsampledIntervals() {
		return this.downsampledIntervals && this.downsampledIntervals.length > 0;
	}

	finishBucket() {
		this.alignments = this.alignments.concat(this.currentBucket.alignments);
        if (this.currentBucket.downsampledCount > 0) {
            this.downsampledIntervals.push(new DownsampledInterval(
                this.currentBucket.start,
                this.currentBucket.end,
                this.currentBucket.downsampledCount));
        }
        this.paired = this.paired || this.currentBucket.paired;
	}
}