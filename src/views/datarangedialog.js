import jQuery from 'jquery';
import {attachDialogCloseHandlerWithParent, presentAlert} from '../utils/utils';

const $ = jQuery;

var igv = null;
export default class DataRangeDialog {
    constructor(igvInstance, $parent) {
        igv = igvInstance;
        var self = this;
        this.container = $('<div class="igv-grid-container-dialog">');
        $parent.append(this.container);

        this.container.draggable();

        this.header = $('<div class="igv-grid-header">');
        this.headerBlurb = $('<div class="igv-grid-header-blurb">');

        this.header.append(this.headerBlurb);

        attachDialogCloseHandlerWithParent(this.header, function () {
            self.hide();
        });

        this.container.append(this.header);

        self.container.append(doLayout());

        self.container.append(doOKCancel());

        function doOKCancel() {

            var rowContainer,
                row,
                column,
                columnFiller;
            row = $('<div class="igv-grid-dialog">');
            // shim
            column = $('<div class="igv-col igv-col-1-8">');
            //
            row.append( column );
            // ok button
            column = $('<div class="igv-col igv-col-3-8">');
            self.ok = $('<div class="igv-col-filler-ok-button">');
            self.ok.text("OK");
            column.append( self.ok );
            //
            row.append( column );
            // cancel button
            column = $('<div class="igv-col igv-col-3-8">');
            columnFiller = $('<div class="igv-col-filler-cancel-button">');
            columnFiller.text("Cancel");
            columnFiller.click(function() { self.hide(); });
            column.append( columnFiller );
            //
            row.append( column );
            // shim
            column = $('<div class="igv-col igv-col-1-8">');
            //
            row.append( column );

            rowContainer = $('<div class="igv-grid-rect">');
            rowContainer.append( row );

            return rowContainer;
        }

        function doLayout() {

            var rowContainer = $('<div class="igv-grid-rect">'),
                row,
                column;

            // minimum
            row = $('<div class="igv-grid-dialog">');

            // vertical spacer
            column = $('<div class="spacer10">');
            row.append( column );


            column = $('<div class="igv-col igv-col-3-8">');
            self.minLabel = $('<div class="igv-data-range-input-label">');
            self.minLabel.text("Minimum");
            column.append( self.minLabel );
            row.append( column );

            column = $('<div class="igv-col igv-col-3-8">');
            self.minInput = $('<input class="igv-data-range-input" type="text" value="125">');
            column.append( self.minInput );
            row.append( column );

            rowContainer.append( row );

            // maximum
            row = $('<div class="igv-grid-dialog">');

            column = $('<div class="igv-col igv-col-3-8">');
            self.maxLabel = $('<div class="igv-data-range-input-label">');
            self.maxLabel.text("Maximum");
            column.append( self.maxLabel );
            row.append( column );

            column = $('<div class="igv-col igv-col-3-8">');
            self.maxInput = $('<input class="igv-data-range-input" type="text" value="250">');
            column.append( self.maxInput );
            row.append( column );
            rowContainer.append( row );

            return rowContainer;
        }

    }

    configureWithTrackView(trackView) {

        var self = this,
            dataRange,
            min,
            max;

        this.trackView = trackView;

        dataRange = this.trackView.dataRange();

        if(dataRange) {
            min = dataRange.min;
            max = dataRange.max;
        } else {
            min = 0;
            max = 100;
        }

        this.minInput.val(min);
        this.maxInput.val(max);

        this.ok.unbind();
        this.ok.click(function() {

            min = parseFloat(self.minInput.val());
            max = parseFloat(self.maxInput.val());
            if(isNaN(min) || isNaN(max)) {
                presentAlert(igv, "Must input numeric values");
            } else {
                trackView.setDataRange(min, max, false);
            }
            self.hide();
        })
    }

    
    hide() {
        this.container.offset( { left: 0, top: 0 } );
        this.container.hide();
    }

    
    show() {
        var body_scrolltop = $("body").scrollTop(),
            track_origin = $(this.trackView.trackDiv).offset(),
            track_size = { width: $(this.trackView.trackDiv).outerWidth(), height: $(this.trackView.trackDiv).outerHeight()};
        this.container.show();
        this.container.offset( { left: (track_size.width - 300), top: (track_origin.top + body_scrolltop) } );
        this.container.offset( igv.constrainBBox(this.container, $(igv.browser.trackContainerDiv)) );
    }

}