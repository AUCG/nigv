import jQuery from 'jquery';
import {attachDialogCloseHandlerWithParent} from '../utils/utils';
const $ = jQuery;

export default class AlertDialog {
    constructor($parent, id) {
        var self = this,
            $header,
            $headerBlurb;
        this.$container = $('<div>', { "id": id, "class": "igv-grid-container-alert-dialog" });
        $parent.append(this.$container);

        $header = $('<div class="igv-grid-header">');
        $headerBlurb = $('<div class="igv-grid-header-blurb">');
        $header.append($headerBlurb);
        attachDialogCloseHandlerWithParent($header, function () {
            self.hide();
        });
        this.$container.append($header);

        this.$container.append(this.alertTextContainer());

        this.$container.append(this.rowOfOk());

    }

    alertTextContainer() {

        var $rowContainer,
            $col;

        $rowContainer = $('<div class="igv-grid-rect">');

        this.$dialogLabel = $('<div>', { "class": "igv-col igv-col-4-4 igv-alert-dialog-text" });

        // $col = $('<div class="igv-col igv-col-4-4">');
        // $col.append(this.$dialogLabel);
        // $rowContainer.append($col);

        $rowContainer.append(this.$dialogLabel);

        return $rowContainer;

    }

    rowOfOk() {

        var self = this,
            $rowContainer,
            $col;

        $rowContainer = $('<div class="igv-grid-rect">');

        // shim
        $col = $('<div class="igv-col igv-col-1-4">');
        $rowContainer.append( $col );

        // ok button
        $col = $('<div class="igv-col igv-col-2-4">');
        this.$ok = $('<div class="igv-col-filler-ok-button">');
        this.$ok.text("OK");

        this.$ok.unbind();
        this.$ok.click(function() {
            self.hide();
        });

        $col.append( this.$ok );
        $rowContainer.append( $col );

        return $rowContainer;

    };

    hide() {

        if (this.$container.hasClass('igv-grid-container-dialog')) {
            this.$container.offset( { left: 0, top: 0 } );
        }
        this.$container.hide();
    };

    show($host) {

        var body_scrolltop,
            track_origin,
            track_size,
            offset,
            _top,
            _left;

        body_scrolltop = $('body').scrollTop();

        if (this.$container.hasClass('igv-grid-container-dialog')) {

            offset = $host.offset();

            _top = offset.top + body_scrolltop;
            _left = $host.outerWidth() - 300;

            this.$container.offset( { left: _left, top: _top } );

            //track_origin = $host.offset();
            //track_size =
            //{
            //    width: $host.outerWidth(),
            //    height: $host.outerHeight()
            //};
            //this.$container.offset( { left: (track_size.width - 300), top: (track_origin.top + body_scrolltop) } );
            //this.$container.offset( igv.constrainBBox(this.$container, $(igv.browser.trackContainerDiv)) );
        }

        this.$container.show();
    }
}