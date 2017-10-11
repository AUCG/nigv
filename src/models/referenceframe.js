import {numberFormatter} from '../utils/utils';

// Reference frame classes.  Converts domain coordinates (usually genomic) to pixel coordinates
export default class ReferenceFrame {
    constructor(chrName, start, bpPerPixel) {
        this.chrName = chrName;
        this.start = start;
        this.bpPerPixel = bpPerPixel;
    }

    toPixels(bp) {
        // TODO -- do we really need ot round this?
        return bp / this.bpPerPixel;
    }

    toBP(pixels) {
        return this.bpPerPixel * pixels;
    }

    shiftPixels(pixels) {
        this.start += pixels * this.bpPerPixel;
    }

    description() {
        return "ReferenceFrame " + this.chrName + " " + numberFormatter(Math.floor(this.start)) + " bpp " + this.bpPerPixel;
    }

}