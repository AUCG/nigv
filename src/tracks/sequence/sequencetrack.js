var igv;
export default class SequenceTrack {

    constructor(igvInstance, config) {
        igv = igvInstance;
        this.config = config;
        this.name = "";
        this.id = "sequence";
        this.sequenceType = config.sequenceType || "dna";             //   dna | rna | prot
        this.height = 15;
        this.disableButtons = true;
        this.order = config.order || 9999;
        this.ignoreTrackMenu = true;
        this.supportsWholeGenome = false;
    };

    getFeatures(chr, bpStart, bpEnd, bpPerPixel) {
        return new Promise(function (fulfill, reject) {
            if (bpPerPixel &&  bpPerPixel > 1) {
                fulfill(null);
            } else {
                igv.browser.genome.sequence.getSequence(chr, bpStart, bpEnd).then(fulfill).catch(reject);
            }
        });
    }

    draw(options) {
        var self = this,
            sequence = options.features,
            ctx = options.context,
            bpPerPixel = options.bpPerPixel,
            bpStart = options.bpStart,
            pixelWidth = options.pixelWidth,
            bpEnd = bpStart + pixelWidth * bpPerPixel + 1,
            len, w, y, pos, offset, b, p0, p1, pc, c;

        if (sequence) {

            len = sequence.length;
            w = 1 / bpPerPixel;

            y = this.height / 2;
            for (pos = bpStart; pos <= bpEnd; pos++) {

                offset = pos - bpStart;
                if (offset < len) {
                    // var b = sequence.charAt(offset);
                    b = sequence[offset];
                    p0 = Math.floor(offset * w);
                    p1 = Math.floor((offset + 1) * w);
                    pc = Math.round((p0 + p1) / 2);

                    if (this.color) {
                        c = this.color;
                    }
                    else if ("dna" === this.sequenceType) {
                        c = igv.nucleotideColors[b];
                    }
                    else {
                        c = "rgb(0, 0, 150)";
                    }

                    if (!c) c = "gray";

                    if (bpPerPixel > 1 / 10) {
                        igv.graphics.fillRect(ctx, p0, 0, p1 - p0, self.height, { fillStyle: c });
                    }
                    else {
                        igv.graphics.strokeText(ctx, b, pc, 3 + y, { strokeStyle: c });
                    }
                }
            }
        }

    }
}