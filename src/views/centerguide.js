import {makeToggleButton} from '../utils/utils';
import jQuery from 'jquery';
const $ = jQuery;

export default class CenterGuide {
    constructor(igv, $parent, config) {
        var self = this;

        this.$container = $('<div class="igv-center-guide igv-center-guide-thin">');
        $parent.append(this.$container);

        if (true === config.showCenterGuide) {
            this.$container.show();
        } else {
            this.$container.hide();
        }

        this.$centerGuideToggle = makeToggleButton(igv, 'center line', 'center line', 'showCenterGuide', function () {
            return self.$container;
        }, function () {
            self.repaint();
        });

    }

    repaint() {
        var ppb,
            trackXY,
            trackHalfWidth,
            width,
            left,
            ls,
            ws,
            center,
            rect,
            referenceFrame;

        if (undefined === igv.browser.genomicStateList) {
            return;
        }

        referenceFrame = igv.browser.genomicStateList[ 0 ].referenceFrame;
        ppb = 1.0/referenceFrame.bpPerPixel;
        if (ppb > 1) {

            rect = igv.browser.syntheticViewportContainerBBox();
            trackXY = rect.position;
            trackHalfWidth = 0.5 * rect.width;

            center = trackXY.left + trackHalfWidth;
            width = referenceFrame.toPixels(1);
            left = center - 0.5 * width;

            ls = Math.round(left).toString() + 'px';
            ws = Math.round(width).toString() + 'px';
            this.$container.css({ left:ls, width:ws });

            this.$container.removeClass('igv-center-guide-thin');
            this.$container.addClass('igv-center-guide-wide');
        } else {

            this.$container.css({ left:'50%', width:'1px' });

            this.$container.removeClass('igv-center-guide-wide');
            this.$container.addClass('igv-center-guide-thin');
        }
    }

    resize() {
        this.repaint();
    }
}