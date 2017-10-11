export default class DownsampleBucket {
	constructor(start, end, alignmentContainer) {
		this.start = start;
        this.end = end;
        this.alignments = [];
        this.downsampledCount = 0;
        this.samplingDepth = alignmentContainer.samplingDepth;
        this.pairsSupported = alignmentContainer.pairsSupported;
        this.downsampledReads = alignmentContainer.downsampledReads;
        this.pairsCache = alignmentContainer.pairsCache;
	}

	addAlignment(alignment) {
		var samplingProb, idx, replacedAlignment, pairedAlignment;

        if (this.alignments.length < this.samplingDepth) {

            if (this.pairsSupported && canBePaired(alignment)) {
                pairedAlignment = this.pairsCache[alignment.readName];
                if (pairedAlignment) {
                    //Not subject to downsampling, just update the existing alignment
                    pairedAlignment.setSecondAlignment(alignment);
                    this.pairsCache[alignment.readName] = undefined;   // Don't need to track this anymore. NOTE: Don't "delete", causes runtime performance issues
                }
                else {
                    // First alignment in a pair
                    pairedAlignment = new igv.PairedAlignment(alignment);
                    this.paired = true;
                    this.pairsCache[alignment.readName] = pairedAlignment;
                    this.alignments.push(pairedAlignment);
                }
            }
            else {
                this.alignments.push(alignment);
            }

        } else {

            samplingProb = this.samplingDepth / (this.samplingDepth + this.downsampledCount + 1);

            if (Math.random() < samplingProb) {

                idx = Math.floor(Math.random() * (this.alignments.length - 1));
                replacedAlignment = this.alignments[idx];   // To be replaced

                if (this.pairsSupported && canBePaired(alignment)) {

                    if(this.pairsCache[replacedAlignment.readName] !== undefined) {
                        this.pairsCache[replacedAlignment.readName] = undefined;
                    }

                    pairedAlignment = new igv.PairedAlignment(alignment);
                    this.paired = true;
                    this.pairsCache[alignment.readName] = pairedAlignment;
                    this.alignments[idx] = pairedAlignment;

                }
                else {
                    this.alignments[idx] = alignment;
                }
                this.downsampledReads.add(replacedAlignment.readName);

            }
            else {
                this.downsampledReads.add(alignment.readName);
            }

            this.downsampledCount++;
        }
	}
}