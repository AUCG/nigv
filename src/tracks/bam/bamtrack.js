import CoverageTrack from './coveragetrack';
import AlignmentTrack from './alignmenttrack';
import BamSource from '../../adaptors/bamsource';
import {configTrack} from '../utils/trackcore';

var igv = null;
export default class BAMTrack {
	constructor(igvInstance, config) {
        igv = igvInstance;

		const alignmentRowYInset = 0;
	    const alignmentStartGap = 5;
	    const downsampleRowHeight = 5;
	    const DEFAULT_COVERAGE_TRACK_HEIGHT = 50;
	    const DEFAULT_TRACK_HEIGHT = 300;

	    this.featureSource = new BamSource(igv, config);

        // Override default track height for bams
        if(config.height === undefined) config.height = DEFAULT_TRACK_HEIGHT;

        configTrack(igv, this, config);

        if(config.coverageTrackHeight === undefined) {
            config.coverageTrackHeight = DEFAULT_COVERAGE_TRACK_HEIGHT;
        }

        this.coverageTrack = new CoverageTrack(igv, config, this);

        this.alignmentTrack = new AlignmentTrack(config, this);

        this.visibilityWindow = config.visibilityWindow || 30000;     // 30kb default

        this.viewAsPairs = config.viewAsPairs;

        this.pairsSupported = (undefined === config.pairsSupported);

        this.color = config.color || "rgb(185, 185, 185)";

        // sort alignment rows
        this.sortOption = config.sortOption || {sort: "NUCLEOTIDE"};
        this.sortDirection = true;

        // filter alignments
        this.filterOption = config.filterOption || {name: "mappingQuality", params: [30, undefined]};

        const filters = {
	        noop: function () {
	            return function (alignment) {
	                return false;
	            };
	        },

	        strand: function (strand) {
	            return function (alignment) {
	                return alignment.strand === strand;
	            };
	        },

	        mappingQuality: function (lower, upper) {
	            return function (alignment) {

	                if (lower && alignment.mq < lower) {
	                    return true;
	                }

	                if (upper && alignment.mq > upper) {
	                    return true;
	                }

	                return false;
	            }
	        }
	    };
	}

	getFeatures (chr, bpStart, bpEnd) {
        return this.featureSource.getAlignments(chr, bpStart, bpEnd);
    };

    altClick(genomicLocation, referenceFrame, event) {
        this.alignmentTrack.sortAlignmentRows(genomicLocation, this.sortOption);

        // TODO - dat. Temporary hack to stand up mult-locus implementation.
        // TODO - dat. MUST identify viewport that was clicked in.
        this.trackView.viewports[ 0 ].redrawTile(this.featureSource.alignmentContainer);
        this.trackView.viewports[ 0 ].$viewport.scrollTop(0);

        this.sortDirection = !this.sortDirection;
    };

    computePixelHeight(alignmentContainer) {
        return this.coverageTrack.computePixelHeight(alignmentContainer) +
            this.alignmentTrack.computePixelHeight(alignmentContainer);
    };

    raw(options) {
        if(this.coverageTrack.height > 0) {
            this.coverageTrack.draw(options);
        }
        this.alignmentTrack.draw(options);
    };

    paintAxis(ctx, pixelWidth, pixelHeight) {
        this.coverageTrack.paintAxis(ctx, pixelWidth, this.coverageTrackHeight);
    };

    popupMenuItemList(config) {
        var self = this,
            $e,
            clickHandler,
            list = [];

        $e = $('<div>');
        $e.text('Sort by base');

        function clickHandler() {
            self.alignmentTrack.sortAlignmentRows(config.genomicLocation, self.sortOption);
            config.viewport.redrawTile(self.featureSource.alignmentContainer);
            config.viewport.$viewport.scrollTop(0);
            self.sortDirection = !(self.sortDirection);
            config.popover.hide();
        };

        list.push({ name: undefined, object: $e, click: clickHandler, init: undefined });

        if (false === self.viewAsPairs) {
            $e = $('<div>');
            $e.text('View mate in split screen');
            function clickHandler() {
                self.alignmentTrack.popupMenuItemList(config);
            };

            list.push({ name: undefined, object: $e, click: clickHandler, init: undefined });
        }
        return list;
    };

    popupData(genomicLocation, xOffset, yOffset, referenceFrame) {
        if (yOffset >= this.coverageTrack.top && yOffset < this.coverageTrack.height) {
            return this.coverageTrack.popupData(genomicLocation, xOffset, this.coverageTrack.top, referenceFrame);
        } else {
            return this.alignmentTrack.popupData(genomicLocation, xOffset, yOffset - this.alignmentTrack.top, referenceFrame);
        }
    };

    popupDataWithConfiguration(config) {
        if (config.y >= this.coverageTrack.top && config.y < this.coverageTrack.height) {
            return this.coverageTrack.popupDataWithConfiguration(config);
        } else {
            return this.alignmentTrack.popupDataWithConfiguration(config);
        }
    };

    menuItemList(popover) {

        var self = this,
            $e,
            html,
            menuItems = [],
            colorByMenuItems = [],
            tagLabel,
            selected;

        // color picker
        menuItems.push(igv.colorPickerMenuItem(popover, this.trackView));

        // sort by genomic location
        menuItems.push(_sortMenuItem(popover));

        colorByMenuItems.push({key: 'none', label: 'track color'});

        if(!self.viewAsPairs) {
            colorByMenuItems.push({key: 'strand', label: 'read strand'});
        }

        if (self.pairsSupported && self.alignmentTrack.hasPairs) {
            colorByMenuItems.push({key: 'firstOfPairStrand', label: 'first-of-pair strand'});
        }

        tagLabel = 'tag' + (self.alignmentTrack.colorByTag ? ' (' + self.alignmentTrack.colorByTag + ')' : '');
        colorByMenuItems.push({key: 'tag', label: tagLabel});

        $e = $('<div class="igv-track-menu-category igv-track-menu-border-top">');
        $e.text('Color by');
        menuItems.push({ name: undefined, object: $e, click: undefined, init: undefined });
        // menuItems.push('<div class="igv-track-menu-category igv-track-menu-border-top">Color by</div>');

        colorByMenuItems.forEach(function (item) {
            selected = (self.alignmentTrack.colorBy === item.key);
            menuItems.push(_colorByMarkup(item, selected));
        });

        html = [];
        if (self.pairsSupported && self.alignmentTrack.hasPairs) {

            html.push('<div class="igv-track-menu-border-top">');
            html.push(true === self.viewAsPairs ? '<i class="fa fa-check">' : '<i class="fa fa-check fa-check-hidden">');
            html.push('</i>');
            html.push('View as pairs');
            html.push('</div>');

            menuItems.push({
                object: $(html.join('')),
                click: function () {
                    var $fa = $(this).find('i');

                    popover.hide();

                    self.viewAsPairs = !self.viewAsPairs;

                    if (true === self.viewAsPairs) {
                        $fa.removeClass('fa-check-hidden');
                    } else {
                        $fa.addClass('fa-check-hidden');
                    }

                    self.featureSource.setViewAsPairs(self.viewAsPairs);
                    self.trackView.update();
                }
            });
        }

        return menuItems;
    }

    _colorByMarkup(menuItem, showCheck, index) {
        var $e,
            clickHandler,
            parts = [];
        parts.push('<div>');
        parts.push(showCheck ? '<i class="fa fa-check"></i>' : '<i class="fa fa-check fa-check-hidden"></i>');
        if (menuItem.key === 'tag') {
            parts.push('<span id="color-by-tag">');
        } else {
            parts.push('<span>');
        }

        parts.push(menuItem.label);
        parts.push('</span>');
        parts.push('</div>');

        $e = $(parts.join(''));

        function clickHandler() {
            igv.popover.hide();
            if ('tag' === menuItem.key) {
                igv.dialog.configure(function () {
                    return "Tag Name"
                }, self.alignmentTrack.colorByTag ? self.alignmentTrack.colorByTag : '', function () {
                    var tag = igv.dialog.$dialogInput.val().trim();
                    self.alignmentTrack.colorBy = 'tag';

                    if (tag !== self.alignmentTrack.colorByTag) {
                        self.alignmentTrack.colorByTag = igv.dialog.$dialogInput.val().trim();
                        self.alignmentTrack.tagColors = new igv.PaletteColorTable("Set1");
                        $('#color-by-tag').text(self.alignmentTrack.colorByTag);
                    }

                    self.trackView.update();
                }, undefined, undefined);

                igv.dialog.show($(self.trackView.trackDiv));
            } else {
                self.alignmentTrack.colorBy = menuItem.key;
                self.trackView.update();
            }
        };
        return { name: undefined, object: $e, click: clickHandler, init: undefined }
    }

    _sortMenuItem(popover) {
        var $e,
            clickHandler;

        $e = $('<div>');
        $e.text('Sort by base');

        clickHandler = function () {
            var genomicState = _.first(igv.browser.genomicStateList),
                referenceFrame = genomicState.referenceFrame,
                genomicLocation,
                viewportHalfWidth;

            popover.hide();

            viewportHalfWidth = Math.floor(0.5 * (igv.browser.viewportContainerWidth()/genomicState.locusCount));
            genomicLocation = Math.floor((referenceFrame.start) + referenceFrame.toBP(viewportHalfWidth));

            self.altClick(genomicLocation, undefined, undefined);

            if ("show center guide" === igv.browser.centerGuide.$centerGuideToggle.text()) {
                igv.browser.centerGuide.$centerGuideToggle.trigger( "click" );
            }

        };

        return { name: undefined, object: $e, click: clickHandler, init: undefined }
    }

	_shadedBaseColor(qual, nucleotide, genomicLocation) {
        var color,
            alpha,
            minQ = 5,   //prefs.getAsInt(PreferenceManager.SAM_BASE_QUALITY_MIN),
            maxQ = 20,  //prefs.getAsInt(PreferenceManager.SAM_BASE_QUALITY_MAX);
            foregroundColor = igv.nucleotideColorComponents[nucleotide],
            backgroundColor = [255, 255, 255];   // White


        //if (171167156 === genomicLocation) {
        //    // NOTE: Add 1 when presenting genomic location
        //    console.log("shadedBaseColor - locus " + igv.numberFormatter(1 + genomicLocation) + " qual " + qual);
        //}

        if (!foregroundColor) return;

        if (qual < minQ) {
            alpha = 0.1;
        } else {
            alpha = Math.max(0.1, Math.min(1.0, 0.1 + 0.9 * (qual - minQ) / (maxQ - minQ)));
        }
        // Round alpha to nearest 0.1
        alpha = Math.round(alpha * 10) / 10.0;

        if (alpha >= 1) {
            color = igv.nucleotideColors[nucleotide];
        }
        else {
            color = "rgba(" + foregroundColor[0] + "," + foregroundColor[1] + "," + foregroundColor[2] + "," + alpha + ")";    //igv.getCompositeColor(backgroundColor, foregroundColor, alpha);
        }
        return color;
    }
}