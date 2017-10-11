import jQuery from 'jquery';
import {attachDialogCloseHandlerWithParent} from '../utils/utils';
const $ = jQuery;

export default class Popover {

    constructor(igv, $parent) {
        this.igv = igv;
        this.$parent = this.initializationHelper($parent);
        // this.$popoverContent.kinetic({});
    }

    initializationHelper($parent) {
        var self = this,
            $popoverHeader;

        // popover container
        this.$popover = $('<div class="igv-popover">');

        $parent.append(this.$popover);

        // popover header
        $popoverHeader = $('<div class="igv-popover-header">');
        this.$popover.append($popoverHeader);

        attachDialogCloseHandlerWithParent($popoverHeader, function () {
            self.hide();
        });

        // popover content
        this.$popoverContent = $('<div>');

        this.$popover.append(this.$popoverContent);

        this.$popover.draggable( { handle: $popoverHeader } );

        return $parent;

    };

    hide() {
        this.$popover.hide();
    };

    presentTrackGearMenu(pageX, pageY, trackView) {

        var $container,
            items;

        items = this.igv.trackMenuItemList(this, trackView);
        if (_.size(items) > 0) {

            this.$popoverContent.empty();
            this.$popoverContent.removeClass("igv-popover-track-popup-content");

            $container = $('<div class="igv-track-menu-container">');
            this.$popoverContent.append($container);

            _.each(items, function(item) {

                if (item.init) {
                    item.init();
                }

                $container.append(item.object);

            });

            this.$popover.css(this._clampPopoverLocation(pageX, pageY, this));
            this.$popover.show();
            this.$popover.offset( igv.constrainBBox(this.$popover, $(igv.browser.trackContainerDiv)) );

        }
    };

    presentTrackPopupMenu(e, viewport) {

        var track = viewport.trackView.track,
            trackLocationState,
            $container,
            menuItems;

        trackLocationState = this._createTrackLocationState(e, viewport);

        if (undefined === trackLocationState) {
            return
        }

        menuItems = this.igv.trackPopupMenuItemList(this, viewport, trackLocationState.genomicLocation, trackLocationState.x, trackLocationState.y);

        if (_.size(menuItems) > 0) {

            this.$popoverContent.empty();
            this.$popoverContent.removeClass("igv-popover-track-popup-content");

            $container = $('<div class="igv-track-menu-container">');
            this.$popoverContent.append($container);

            _.each(menuItems, function(item) {
                $container.append(item.object);
            });

            this.$popover.css(this._clampPopoverLocation(e.pageX, e.pageY, this));
            this.$popover.show();
        }

    };

    presentTrackPopup(e, viewport) {

        var track = viewport.trackView.track,
            referenceFrame = viewport.genomicState.referenceFrame,
            trackLocationState,
            dataList,
            popupClickHandlerResult,
            content,
            config;

        trackLocationState = this._createTrackLocationState(e, viewport);
        if (undefined === trackLocationState) {
            return
        }

        // dataList = track.popupData(trackLocationState.genomicLocation, trackLocationState.x, trackLocationState.y, referenceFrame);

        config =
            {
                popover: this,
                viewport:viewport,
                genomicLocation: trackLocationState.genomicLocation,
                x: trackLocationState.x,
                y: trackLocationState.y
            };
        dataList = track.popupDataWithConfiguration(config);

        popupClickHandlerResult = this.igv.browser.fireEvent('trackclick', [track, dataList]);

        if (undefined === popupClickHandlerResult) {

            if (_.size(dataList) > 0) {
                content = this.igv.formatPopoverText(dataList);
            }

        } else if (typeof popupClickHandlerResult === 'string') {
            content = popupClickHandlerResult;
        }

        this.presentContent(e.pageX, e.pageY, content);

    };

    presentContent(pageX, pageY, content) {
        var $container;

        if (undefined === content) {
            return;
        }

        this.$popoverContent.empty();
        this.$popoverContent.addClass("igv-popover-track-popup-content");

        $container = $('<div class="igv-track-menu-container">');
        this.$popoverContent.append($container);
        this.$popoverContent.html(content);

        this.$popover.css(this._clampPopoverLocation(pageX, pageY, this));
        this.$popover.show();

    };

    _createTrackLocationState(e, viewport) {

        var referenceFrame = viewport.genomicState.referenceFrame,
            genomicLocation,
            canvasCoords,
            xOrigin;

        canvasCoords = this.igv.translateMouseCoordinates(e, viewport.canvas);
        genomicLocation = Math.floor((referenceFrame.start) + referenceFrame.toBP(canvasCoords.x));

        if (undefined === genomicLocation || null === viewport.tile) {
            return undefined;
        }

        xOrigin = Math.round(referenceFrame.toPixels((viewport.tile.startBP - referenceFrame.start)));

        return { genomicLocation: genomicLocation, x: canvasCoords.x - xOrigin, y: canvasCoords.y }

    }

    _clampPopoverLocation(pageX, pageY, popover) {

        var left,
            containerCoordinates = { x: pageX, y: pageY },
            containerRect = { x: 0, y: 0, width: $(window).width(), height: $(window).height() },
            popupRect,
            popupX = pageX,
            popupY = pageY;

        popupX -= popover.$parent.offset().left;
        popupY -= popover.$parent.offset().top;
        popupRect = { x: popupX, y: popupY, width: popover.$popover.outerWidth(), height: popover.$popover.outerHeight() };

        left = popupX;
        if (containerCoordinates.x + popupRect.width > containerRect.width) {
            left = popupX - popupRect.width;
        }

        return { "left": left + "px", "top": popupY + "px" };
    }

}