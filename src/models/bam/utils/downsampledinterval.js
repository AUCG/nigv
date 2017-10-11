export default class DownsampledInterval {
	constructor(start, end, counts) {
        this.start = start;
        this.end = end;
        this.counts = counts;
	}

	popupData(genomicLocation) {
		return [
            {name: "start", value: this.start + 1},
            {name: "end", value: this.end},
            {name: "# downsampled:", value: this.counts}
		];
	}
}