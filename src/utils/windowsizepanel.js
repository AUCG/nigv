import jQuery from 'jquery';
import {prettyBasePairNumber} from './utils';
const $ = jQuery;

var igv = null;
export default class WindowSizePanel {
    constructor(igvInstance, $parent) {
        igv = igvInstance;
        this.$content = $('<div class="igv-windowsizepanel-content-div">');
        $parent.append(this.$content);
    }

    show() {
        this.$content.show();
    };

    hide() {
        this.$content.hide();
    };

    updateWithGenomicState(genomicState) {
        var viewportWidth,
            referenceFrame,
            length;

        if (1 === genomicState.locusCount && 'all' !== genomicState.locusSearchString.toLowerCase()) {
            this.show();
        } else {
            this.hide();
        }

        viewportWidth = igv.Viewport.viewportWidthAtLocusIndex(genomicState.locusIndex);
        referenceFrame = genomicState.referenceFrame;

        length = viewportWidth * referenceFrame.bpPerPixel;

        this.$content.text(prettyBasePairNumber(Math.round(length)));
    }
}