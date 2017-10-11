import BamAlignment from './bamalignment';

export default class PairedAlignment extends BamAlignment {
    constructor(firstAlignment) {
        super();
		this.firstAlignment = firstAlignment;
        this.chr = firstAlignment.chr;
        this.readName = firstAlignment.readName;

        if (firstAlignment.start < firstAlignment.mate.position) {
            this.start = firstAlignment.start;
            this.end = Math.max(firstAlignment.mate.position, firstAlignment.start + firstAlignment.lengthOnRef);  // Approximate
            this.connectingStart = firstAlignment.start + firstAlignment.lengthOnRef;
            this.connectingEnd = firstAlignment.mate.position;
        }
        else {
            this.start = firstAlignment.mate.position;
            this.end = firstAlignment.start + firstAlignment.lengthOnRef;
            this.connectingStart = firstAlignment.mate.position;
            this.connectingEnd = firstAlignment.start;
        }
        this.lengthOnRef = this.end - this.start;
	}

	setSecondAlignment(alignment) {
		// TODO -- check the chrs are equal,  error otherwise
        this.secondAlignment = alignment;

        if (alignment.start > this.firstAlignment.start) {
            this.end = alignment.start + alignment.lengthOnRef;
            this.connectingEnd = alignment.start;
        }
        else {
            this.start = alignment.start;
            this.connectingStart = alignment.start + alignment.lengthOnRef;
        }
        this.lengthOnRef = this.end - this.start;
	}

	popupData(genomicLocation) {
		let nameValues = [];

        nameValues = nameValues.concat(this.firstAlignment.popupData(genomicLocation));

        if (this.secondAlignment) {
            nameValues.push("-------------------------------");
            nameValues = nameValues.concat(this.secondAlignment.popupData(genomicLocation));
        }
        return nameValues;
	}

	isPaired() {
		return true;
	}

	firstOfPairStrand() {
		if (this.firstAlignment.isFirstOfPair()) {
            return this.firstAlignment.strand;
        }
        else if (this.secondAlignment && this.secondAlignment.isFirstOfPair()) {
            return this.secondAlignment.strand;
        }
        else {
            return this.firstAlignment.mate.strand;    // Assumption is mate is first-of-pair
        }
	}
}