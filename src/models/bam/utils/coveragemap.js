import Coverage from './coverage';

export default class CoverageMap {
	constructor(chr, start, end, alignments, refSeq) {
		const myself = this;

        this.refSeq = refSeq;
        this.chr = chr;
        this.bpStart = start;
        this.length = (end - start);

        this.coverage = new Array(this.length);

        this.maximum = 0;

        this.threshold = 0.2;
        this.qualityWeight = true;

        alignments || alignments.forEach(function (alignment) {
            alignment.blocks.forEach(function (block) {

                var key,
                    base,
                    i,
                    j,
                    q;

                for (i = block.start - myself.bpStart, j = 0; j < block.len; i++, j++) {

                    if (!myself.coverage[ i ]) {
                        myself.coverage[ i ] = new Coverage();
                    }

                    base = block.seq.charAt(j);
                    key = (alignment.strand) ? "pos" + base : "neg" + base;
                    q = block.qual[j];

                    myself.coverage[ i ][ key ] += 1;
                    myself.coverage[ i ][ "qual" + base ] += q;

                    myself.coverage[ i ].total += 1;
                    myself.coverage[ i ].qual += q;

                    myself.maximum = Math.max(myself.coverage[ i ].total, myself.maximum);

                    //if (171168321 === (j + block.start)) {
                    //    // NOTE: Add 1 when presenting genomic location
                    //    console.log("locus " + igv.numberFormatter(1 + 171168321) + " base " + base + " qual " + q);
                    //}
                }

            });
        });

	}

	incCounts(alignment) {
		const self = this;
        if (alignment.blocks === undefined) {
            _incBlockCount(alignment);
        }
        else {
            alignment.blocks.forEach(function (block) {
                _incBlockCount(block);
            });
        }
	}

    _incBlockCount(block) {
        let key, base, i, j, q;
        for (i = block.start - self.bpStart, j = 0; j < block.len; i++, j++) {
            if (!self.coverage[i]) {
                self.coverage[i] = new Coverage();
            }

            base = block.seq.charAt(j);
            key = (alignment.strand) ? "pos" + base : "neg" + base;
            q = block.qual[j];

            self.coverage[i][key] += 1;
            self.coverage[i]["qual" + base] += q;

            self.coverage[i].total += 1;
            self.coverage[i].qual += q;

            self.maximum = Math.max(self.coverage[i].total, self.maximum);
        }
    }
}