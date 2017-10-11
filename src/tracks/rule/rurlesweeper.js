import * as _ from 'underscore';
import jQuery from 'jquery';
const $ = jQuery;

var igv;
export default class RulerSweeper {
    constructor(igvInstance, viewport, $viewport, $viewportContent, genomicState) {
        igv = igvInstance;
        this.viewport = viewport;
        this.$viewport = $viewport;
        this.$viewportContent = $viewportContent;
        this.genomicState = genomicState;

        this.$rulerSweeper = $('<div class="igv-ruler-sweeper-div">');
        this.$viewportContent.append(this.$rulerSweeper);

        this.wholeGenomeLayout(this.$viewportContent.find('.igv-whole-genome-container'));

        this.addMouseHandlers();
    }

    wholeGenomeLayout($container) {
        const self = this;
        let $div, $e;

        const nameLast = _.last(igv.browser.genome.chromosomeNames);
        const chrLast = igv.browser.genome.getChromosome(nameLast);
        const extent = Math.floor(chrLast.bpLength/1000) + igv.browser.genome.getCumulativeOffset(nameLast);

        const viewportWidth = this.$viewport.width();
        let scraps = 0;
        _.each(igv.browser.genome.chromosomeNames, function (name) {
            var w,
                percentage;

            percentage = (igv.browser.genome.getChromosome(name).bpLength/1000)/extent;
            if (percentage * viewportWidth < 1.0) {
                scraps += percentage;
            } else {
                $div = $('<div>');
                $container.append($div);

                w = Math.floor(percentage * viewportWidth);
                $div.width(w);

                $e = $('<span>');
                $div.append($e);

                $e.text(name);

                $div.on('click', function (e) {
                    var locusString,
                        loci;

                    self.$viewportContent.find('.igv-whole-genome-container').hide();
                    self.$viewportContent.find('canvas').show();

                    if (1 === self.genomicState.locusCount) {
                        locusString = name;
                    } else {
                        loci = _.map(igv.browser.genomicStateList, function (g) {
                            return g.locusSearchString;
                        });

                        loci[ self.genomicState.locusIndex ] = name;
                        locusString = loci.join(' ');
                    }

                    igv.browser.parseSearchInput(locusString);
                });
            }

        });

        scraps *= viewportWidth;
        scraps = Math.floor(scraps);
        if (scraps >= 1) {

            $div = $('<div>');
            $container.append($div);

            $div.width(scraps);

            $e = $('<span>');
            $div.append($e);

            $e.text('-');

        }

    }

    disableMouseHandlers() {
        this.$viewportContent.off();
        this.$viewport.off();
    }

    addMouseHandlers() {
        var self = this,
            isMouseDown = undefined,
            isMouseIn = undefined,
            mouseDownXY = undefined,
            mouseMoveXY = undefined,
            left,
            rulerSweepWidth,
            rulerSweepThreshold = 1,
            dx;

        this.disableMouseHandlers();

        this.$viewport.on({

            mousedown: function (e) {

                e.preventDefault();
                e.stopPropagation();

                self.$viewportContent.off();

                self.$viewportContent.on({
                    mousedown: function (e) {

                        e.preventDefault();
                        e.stopPropagation();

                        isMouseDown = true;
                    }
                });

                // mouseDownXY = igv.translateMouseCoordinates(e, self.contentDiv);
                mouseDownXY = { x:e.offsetX, y:e.offsetY };

                left = mouseDownXY.x;
                rulerSweepWidth = 0;
                self.$rulerSweeper.css({"display": "inline", "left": left + "px", "width": rulerSweepWidth + "px"});

                isMouseIn = true;
            },

            mousemove:function (e) {

                e.preventDefault();
                e.stopPropagation();

                if (isMouseDown && isMouseIn) {

                    // mouseMoveXY = igv.translateMouseCoordinates(e, self.contentDiv);
                    mouseMoveXY = { x:e.offsetX, y:e.offsetY };

                    dx = mouseMoveXY.x - mouseDownXY.x;
                    rulerSweepWidth = Math.abs(dx);

                    if (rulerSweepWidth > rulerSweepThreshold) {

                        self.$rulerSweeper.css({"width": rulerSweepWidth + "px"});

                        if (dx < 0) {

                            if (mouseDownXY.x + dx < 0) {
                                isMouseIn = false;
                                left = 0;
                            } else {
                                left = mouseDownXY.x + dx;
                            }
                            self.$rulerSweeper.css({"left": left + "px"});
                        }
                    }
                }
            },

            mouseup: function (e) {
                var extent,
                    referenceFrame;

                e.preventDefault();
                e.stopPropagation();

                if (isMouseDown) {

                    // End sweep
                    isMouseDown = false;
                    isMouseIn = false;

                    self.$rulerSweeper.css({ "display": "none", "left": 0 + "px", "width": 0 + "px" });

                    referenceFrame = self.genomicState.referenceFrame;

                    extent = {};
                    extent.start = referenceFrame.start + (left * referenceFrame.bpPerPixel);
                    extent.end = extent.start + rulerSweepWidth * referenceFrame.bpPerPixel;

                    if (rulerSweepWidth > rulerSweepThreshold) {
                        igv.Browser.validateLocusExtent(igv.browser.genome.getChromosome(referenceFrame.chrName), extent);
                        self.viewport.goto(referenceFrame.chrName, extent.start, extent.end);
                    }
                }
            }
        })
    }
}