import jQuery from 'jquery';
import {attachDialogCloseHandlerWithParent} from '../utils/utils';
const $ = jQuery;

export class Dialog {
    constructor($parent, constructorHelper) {
        var self = this,
            $header,
            $headerBlurb;

        this.$container = $('<div class="igv-grid-container-dialog">');

        $parent.append( this.$container[ 0 ] );

        $header = $('<div class="igv-grid-header">');
        $headerBlurb = $('<div class="igv-grid-header-blurb">');
        $header.append($headerBlurb[ 0 ]);

        this.$container.append($header[ 0 ]);

        constructorHelper(this);

        attachDialogCloseHandlerWithParent($header, function () {
            self.hide();
        });

    }

    rowOfOk() {
        var $rowContainer,
            $row,
            $column,
            $columnFiller;

        $row = $('<div class="igv-grid-dialog">');

        // shim
        $column = $('<div class="igv-col igv-col-1-4">');
        //
        $row.append( $column[ 0 ] );


        // ok button
        $column = $('<div class="igv-col igv-col-2-4">');
        $columnFiller = $('<div class="igv-col-filler-ok-button">');
        $columnFiller.text("OK");

        this.$ok = $columnFiller;

        $column.append( $columnFiller[ 0 ] );
        //
        $row.append( $column[ 0 ] );

        //
        $rowContainer = $('<div class="igv-grid-rect">');
        $rowContainer.append( $row[ 0 ]);

        return $rowContainer;

    }

    rowOfOkCancel() {

        var self = this,
            $rowContainer,
            $row,
            $column,
            $columnFiller;

        $row = $('<div class="igv-grid-dialog">');

        // shim
        $column = $('<div class="igv-col igv-col-1-8">');
        //
        $row.append( $column[ 0 ] );


        // ok button
        $column = $('<div class="igv-col igv-col-3-8">');
        $columnFiller = $('<div class="igv-col-filler-ok-button">');
        $columnFiller.text("OK");

        this.$ok = $columnFiller;

        $column.append( $columnFiller[ 0 ] );
        //
        $row.append( $column[ 0 ] );


        // cancel button
        $column = $('<div class="igv-col igv-col-3-8">');
        $columnFiller = $('<div class="igv-col-filler-cancel-button">');
        $columnFiller.text("Cancel");
        $columnFiller.click(function() {
            self.$dialogInput.val(undefined);
            self.hide();
        });
        $column.append( $columnFiller[ 0 ] );
        //
        $row.append( $column[ 0 ] );

        // shim
        $column = $('<div class="igv-col igv-col-1-8">');
        //
        $row.append( $column[ 0 ] );

        $rowContainer = $('<div class="igv-grid-rect">');
        $rowContainer.append( $row[ 0 ]);

        return $rowContainer;

    }

    rowOfLabel() {

        var rowContainer,
            row,
            column;

        // input
        row = $('<div class="igv-grid-dialog">');

        column = $('<div class="igv-col igv-col-4-4">');
        this.$dialogLabel = $('<div class="igv-user-input-label">');

        column.append( this.$dialogLabel[ 0 ] );
        row.append( column[ 0 ] );

        rowContainer = $('<div class="igv-grid-rect">');
        rowContainer.append( row[ 0 ]);

        return rowContainer;

    }

    rowOfInput() {

        var rowContainer,
            row,
            column;

        // input
        row = $('<div class="igv-grid-dialog">');

        column = $('<div class="igv-col igv-col-4-4">');
        this.$dialogInput = $('<input class="igv-user-input-dialog" type="text" value="#000000">');

        column.append( this.$dialogInput[ 0 ] );
        row.append( column[ 0 ] );

        rowContainer = $('<div class="igv-grid-rect">');
        rowContainer.append( row[ 0 ]);

        return rowContainer;

    }

    configure(labelHTMLFunction, inputValue, clickFunction) {

        var self = this,
            clickOK;

        if (labelHTMLFunction) {
            self.$dialogLabel.html(labelHTMLFunction());
            self.$dialogLabel.show();
        } else {
            self.$dialogLabel.hide();
        }

        if (inputValue !== undefined) {

            self.$dialogInput.val(inputValue);

            self.$dialogInput.unbind();
            self.$dialogInput.change(function(){

                if (clickFunction) {
                    clickFunction();
                }

                self.hide();
            });

            self.$dialogInput.show();
        } else {
            self.$dialogInput.hide();
        }

        self.$ok.unbind();
        self.$ok.click(function() {

            if (clickFunction) {
                clickFunction();
            }

            self.hide();
        });

    }

    hide() {

        if (this.$container.hasClass('igv-grid-container-dialog')) {
            this.$container.offset( { left: 0, top: 0 } );
        }
        this.$container.hide();
    }

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

export function dialogConstructor(dialog) {
    dialog.$container.append(dialog.rowOfLabel()[ 0 ]);
    dialog.$container.append(dialog.rowOfInput()[ 0 ]);
    dialog.$container.append(dialog.rowOfOkCancel()[ 0 ]);
    dialog.$container.draggable();
}