import PairedAlignment from '../../models/bam/pairedalignment';
import graphics from '../../utils/graphics';
import {nucleotideColors, addAlphaToRGB} from '../../utils/colors';

export default class AlignmentTrack {
	constructor(config, parent) {
        this.parent = parent;
        this.featureSource = parent.featureSource;
        this.top = config.coverageTrackHeight == 0 ? 0 : config.coverageTrackHeight  + 5;
        this.alignmentRowHeight = config.alignmentRowHeight || 14;

        this.negStrandColor = config.negStrandColor || "rgba(150, 150, 230, 0.75)";
        this.posStrandColor = config.posStrandColor || "rgba(230, 150, 150, 0.75)";
        this.insertionColor = config.insertionColor || "rgb(138, 94, 161)";
        this.deletionColor = config.deletionColor || "black";
        this.skippedColor = config.skippedColor || "rgb(150, 170, 170)";

        this.colorBy = config.colorBy || "none";
        this.colorByTag = config.colorByTag;
        this.bamColorTag = config.bamColorTag === undefined ? "YC" : config.bamColorTag;

        // sort alignment rows
        this.sortOption = config.sortOption || {sort: "NUCLEOTIDE"};

        this.sortDirection = true;

        this.hasPairs = false;   // Until proven otherwise
    };

    computePixelHeight(alignmentContainer) {
        if (alignmentContainer.packedAlignmentRows) {
            var h = 0;
            if (alignmentContainer.hasDownsampledIntervals()) {
                h += downsampleRowHeight + alignmentStartGap;
            }
            return h + (this.alignmentRowHeight * alignmentContainer.packedAlignmentRows.length) + 5;
        }
        else {
            return this.height;
        }
    };

    draw(options) {
        var self = this,
            alignmentContainer = options.features,
            ctx = options.context,
            bpPerPixel = options.bpPerPixel,
            bpStart = options.bpStart,
            pixelWidth = options.pixelWidth,
            bpEnd = bpStart + pixelWidth * bpPerPixel + 1,
            packedAlignmentRows = alignmentContainer.packedAlignmentRows,
            sequence = alignmentContainer.sequence;

        if (this.top) ctx.translate(0, this.top);

        if (sequence) {
            sequence = sequence.toUpperCase();
        }

        if (alignmentContainer.hasDownsampledIntervals()) {
            alignmentRowYInset = downsampleRowHeight + alignmentStartGap;

            alignmentContainer.downsampledIntervals.forEach(function (interval) {
                var xBlockStart = (interval.start - bpStart) / bpPerPixel,
                    xBlockEnd = (interval.end - bpStart) / bpPerPixel;

                if (xBlockEnd - xBlockStart > 5) {
                    xBlockStart += 1;
                    xBlockEnd -= 1;
                }
                graphics.fillRect(ctx, xBlockStart, 2, (xBlockEnd - xBlockStart), downsampleRowHeight - 2, {fillStyle: "black"});
            })

        }
        else {
            alignmentRowYInset = 0;
        }

        if (packedAlignmentRows) {

            packedAlignmentRows.forEach(function renderAlignmentRow(alignmentRow, i) {

                var yRect = alignmentRowYInset + (self.alignmentRowHeight * i),
                    alignmentHeight = self.alignmentRowHeight - 2,
                    i,
                    b,
                    alignment;

                for (i = 0; i < alignmentRow.alignments.length; i++) {

                    alignment = alignmentRow.alignments[i];

                    self.hasPairs = self.hasPairs || alignment.isPaired();

                    if ((alignment.start + alignment.lengthOnRef) < bpStart) continue;
                    if (alignment.start > bpEnd) break;


                    if (true === alignment.hidden) {
                        continue;
                    }

                    if (alignment instanceof PairedAlignment) {

                        _drawPairConnector(alignment, yRect, alignmentHeight);

                        _drawSingleAlignment(alignment.firstAlignment, yRect, alignmentHeight);

                        if (alignment.secondAlignment) {
                            _drawSingleAlignment(alignment.secondAlignment, yRect, alignmentHeight);
                        }

                    }
                    else {
                        _drawSingleAlignment(alignment, yRect, alignmentHeight);
                    }

                }
            });
        }
    }

    _drawPairConnector(alignment, yRect, alignmentHeight) {
        var alignmentColor = _getAlignmentColor.call(self, alignment.firstAlignment),
            outlineColor = 'alignmentColor',
            xBlockStart = (alignment.connectingStart - bpStart) / bpPerPixel,
            xBlockEnd = (alignment.connectingEnd - bpStart) / bpPerPixel,
            yStrokedLine = yRect + alignmentHeight / 2;

        if ((alignment.connectingEnd) < bpStart || alignment.connectingStart > bpEnd) {
            return;
        }

        if (alignment.mq <= 0) {
            alignmentColor = addAlphaToRGB(alignmentColor, "0.15");
        }

        graphics.setProperties(ctx, { fillStyle: alignmentColor, strokeStyle: outlineColor } );

        graphics.strokeLine(ctx, xBlockStart, yStrokedLine, xBlockEnd, yStrokedLine);
    }

    _drawSingleAlignment(alignment, yRect, alignmentHeight) {
        var alignmentColor = _getAlignmentColor.call(self, alignment),
            outlineColor = 'alignmentColor',
            lastBlockEnd,
            blocks = alignment.blocks,
            block,
            b;

        if ((alignment.start + alignment.lengthOnRef) < bpStart || alignment.start > bpEnd) {
            return;
        }

        if (alignment.mq <= 0) {
            alignmentColor = addAlphaToRGB(alignmentColor, "0.15");
        }

        graphics.setProperties(ctx, { fillStyle: alignmentColor, strokeStyle: outlineColor } );

        for(let b = 0; b < blocks.length; b++) {   // Can't use forEach here -- we need ability to break
            block = blocks[b];
            if ((block.start + block.len) < bpStart) continue;
            _drawBlock(block);
            if ((block.start + block.len) > bpEnd) break;  // Do this after drawBlock to insure gaps are drawn
            if (alignment.insertions) {
                alignment.insertions.forEach(function (block) {
                    var refOffset = block.start - bpStart,
                        xBlockStart = refOffset / bpPerPixel - 1,
                        widthBlock = 3;
                    graphics.fillRect(ctx, xBlockStart, yRect - 1, widthBlock, alignmentHeight + 2, {fillStyle: self.insertionColor});
                });
            }
        }
    }

    _drawBlock(block) {
            var seqOffset = block.start - alignmentContainer.start,
                xBlockStart = (block.start - bpStart) / bpPerPixel,
                xBlockEnd = ((block.start + block.len) - bpStart) / bpPerPixel,
                widthBlock = Math.max(1, xBlockEnd - xBlockStart),
                widthArrowHead = self.alignmentRowHeight / 2.0,
                blockSeq = block.seq.toUpperCase(),
                skippedColor = self.skippedColor,
                deletionColor = self.deletionColor,
                refChar,
                readChar,
                readQual,
                xBase,
                widthBase,
                colorBase,
                x,
                y,
                i,
                yStrokedLine = yRect + alignmentHeight / 2;

            if (block.gapType !== undefined && xBlockEnd !== undefined && lastBlockEnd !== undefined) {
                if ("D" === block.gapType) {
                    graphics.strokeLine(ctx, lastBlockEnd, yStrokedLine, xBlockStart, yStrokedLine, {strokeStyle: deletionColor});
                }
                else {
                    graphics.strokeLine(ctx, lastBlockEnd, yStrokedLine, xBlockStart, yStrokedLine, {strokeStyle: skippedColor});
                }
            }
            lastBlockEnd = xBlockEnd;

            if (true === alignment.strand && b === blocks.length - 1) {
                // Last block on + strand
                x = [
                    xBlockStart,
                    xBlockEnd,
                    xBlockEnd + widthArrowHead,
                    xBlockEnd,
                    xBlockStart,
                    xBlockStart];
                y = [
                    yRect,
                    yRect,
                    yRect + (alignmentHeight / 2.0),
                    yRect + alignmentHeight,
                    yRect + alignmentHeight,
                    yRect];

                graphics.fillPolygon(ctx, x, y, { fillStyle: alignmentColor });

                if (self.highlightedAlignmentReadNamed === alignment.readName) {
                    graphics.strokePolygon(ctx, x, y, { strokeStyle: 'red' });
                }

                if (alignment.mq <= 0) {
                    graphics.strokePolygon(ctx, x, y, {strokeStyle: outlineColor});
                }
            }
            else if (false === alignment.strand && b === 0) {
                // First block on - strand
                x = [
                    xBlockEnd,
                    xBlockStart,
                    xBlockStart - widthArrowHead,
                    xBlockStart,
                    xBlockEnd,
                    xBlockEnd];
                y = [
                    yRect,
                    yRect,
                    yRect + (alignmentHeight / 2.0),
                    yRect + alignmentHeight,
                    yRect + alignmentHeight,
                    yRect];

                graphics.fillPolygon(ctx, x, y, {fillStyle: alignmentColor});

                if (self.highlightedAlignmentReadNamed === alignment.readName) {
                    graphics.strokePolygon(ctx, x, y, { strokeStyle: 'red' });
                }

                if (alignment.mq <= 0) {
                    graphics.strokePolygon(ctx, x, y, {strokeStyle: outlineColor});
                }
            }
            else {
                graphics.fillRect(ctx, xBlockStart, yRect, widthBlock, alignmentHeight, {fillStyle: alignmentColor});
                if (alignment.mq <= 0) {
                    ctx.save();
                    ctx.strokeStyle = outlineColor;
                    ctx.strokeRect(xBlockStart, yRect, widthBlock, alignmentHeight);
                    ctx.restore();
                }
            }
            // Only do mismatch coloring if a refseq exists to do the comparison
            if (sequence && blockSeq !== "*") {
                for (var i = 0, len = blockSeq.length; i < len; i++) {
                    readChar = blockSeq.charAt(i);
                    refChar = sequence.charAt(seqOffset + i);
                    if (readChar === "=") {
                        readChar = refChar;
                    }
                    if (readChar === "X" || refChar !== readChar) {
                        if (block.qual && block.qual.length > i) {
                            readQual = block.qual[i];
                            colorBase = shadedBaseColor(readQual, readChar, i + block.start);
                        }
                        else {
                            colorBase = nucleotideColors[readChar];
                        }
                        if (colorBase) {
                            xBase = ((block.start + i) - bpStart) / bpPerPixel;
                            widthBase = Math.max(1, 1 / bpPerPixel);
                            graphics.fillRect(ctx, xBase, yRect, widthBase, alignmentHeight, { fillStyle: colorBase });
                        }
                    }
                }
            }
    }

    sortAlignmentRows(genomicLocation, sortOption) {
        const self = this;
        this.featureSource.alignmentContainer.packedAlignmentRows.forEach(function (row) {
            row.updateScore(genomicLocation, self.featureSource.alignmentContainer, sortOption);
        });

        this.featureSource.alignmentContainer.packedAlignmentRows.sort(function (rowA, rowB) {
            // return rowA.score - rowB.score;
            return true === self.sortDirection ? rowA.score - rowB.score : rowB.score - rowA.score;
        });
    };

    popupDataWithConfiguration(config) {
        const clickedObject = this.getClickedAlignment(config.viewport, config.genomicLocation);
        return clickedObject ? clickedObject.popupData(config.genomicLocation) : undefined;
    };

    popupData(genomicLocation, xOffset, yOffset, referenceFrame) {
        const packedAlignmentRows = this.featureSource.alignmentContainer.packedAlignmentRows;
        const downsampledIntervals = this.featureSource.alignmentContainer.downsampledIntervals;
		let alignmentRow, clickedObject, i, len, tmp;
        const packedAlignmentsIndex = Math.floor((yOffset - (alignmentRowYInset)) / this.alignmentRowHeight);
        
        if(packedAlignmentsIndex < 0) {
            for(i = 0, len = downsampledIntervals.length; i < len; i++) {
                if(downsampledIntervals[i].start <= genomicLocation && (downsampledIntervals[i].end >= genomicLocation)) {
                    clickedObject = downsampledIntervals[i];
                    break;
                }
            }
        }
        else if(packedAlignmentsIndex < packedAlignmentRows.length) {
            alignmentRow = packedAlignmentRows[packedAlignmentsIndex];
            clickedObject = undefined;
            for (i = 0, len = alignmentRow.alignments.length, tmp; i < len; i++) {
                tmp = alignmentRow.alignments[i];
                if (tmp.start <= genomicLocation && (tmp.start + tmp.lengthOnRef >= genomicLocation)) {
                    clickedObject = tmp;
                    break;
                }
            }
        }

        if (clickedObject) {
            return clickedObject.popupData(genomicLocation);
        } else {
            return [];
        }
    };

    popupMenuItemList(config) {
        var loci,
            mateLoci,
            index,
            head,
            tail;

        this.highlightedAlignmentReadNamed = undefined;

        config.popover.hide();
        const alignment = this.getClickedAlignment(config.viewport, config.genomicLocation);
        if (alignment) {
            this.highlightedAlignmentReadNamed = alignment.readName;
            loci = _.map(igv.browser.genomicStateList, function(gs) {
                return gs.locusSearchString;
            });

            index = config.viewport.genomicState.locusIndex;
            head = _.first(loci, 1 + index);
            tail = _.size(loci) === 1 ? undefined : _.last(loci, _.size(loci) - (1 + index));

            mateLoci = _locusPairWithAlignmentAndViewport(alignment, config.viewport);

            // discard last element of head and replace with mateLoci
            head.splice(-1, 1);
            Array.prototype.push.apply(head, mateLoci);
            if (tail) {
                Array.prototype.push.apply(head, tail);
            }

            igv.browser.parseSearchInput( head.join(' ') );
        }
    }

	_locusPairWithAlignmentAndViewport(alignment, viewport) {
        var left,
            right,
            centroid,
            widthBP;

        widthBP = viewport.$viewport.width() * viewport.genomicState.referenceFrame.bpPerPixel;

        centroid = (alignment.start + (alignment.start + alignment.lengthOnRef)) / 2;
        left = alignment.chr + ':' + Math.round(centroid - widthBP/2.0).toString() + '-' + Math.round(centroid + widthBP/2.0).toString();

        centroid = (alignment.mate.position + (alignment.mate.position + alignment.lengthOnRef)) / 2;
        right = alignment.chr + ':' + Math.round(centroid - widthBP/2.0).toString() + '-' + Math.round(centroid + widthBP/2.0).toString();

        return [ left, right ];
    }

    getClickedAlignment(viewport, genomicLocation) {
        var packedAlignmentRows,
            row,
            index,
            clicked;

        packedAlignmentRows = viewport.drawConfiguration.features.packedAlignmentRows;
        clicked = undefined;
        _.each(packedAlignmentRows, function (row) {

            if (undefined === clicked) {
                clicked = _.filter(row.alignments, function(alignment) {
                    return (alignment.isPaired() && alignment.isMateMapped() && alignment.start <= genomicLocation && (alignment.start + alignment.lengthOnRef >= genomicLocation));
                });
            } // if (undefined === clicked)

        });
        return clicked ? _.first(clicked) : undefined;
    };

	_getAlignmentColor(alignment) {
        var alignmentTrack = this,
            option = alignmentTrack.colorBy,
            tagValue, color,
            strand;

        color = alignmentTrack.parent.color;
        switch (option) {
            case "strand":
                color = alignment.strand ? alignmentTrack.posStrandColor : alignmentTrack.negStrandColor;
                break;

            case "firstOfPairStrand":
                if(alignment instanceof PairedAlignment) {
                    color = alignment.firstOfPairStrand() ? alignmentTrack.posStrandColor : alignmentTrack.negStrandColor;
                }
                else if (alignment.isPaired()) {

                    if (alignment.isFirstOfPair()) {
                        color = alignment.strand ? alignmentTrack.posStrandColor : alignmentTrack.negStrandColor;
                    }
                    else if (alignment.isSecondOfPair()) {
                        color = alignment.strand ? alignmentTrack.negStrandColor : alignmentTrack.posStrandColor;
                    }
                    else {
                        console.log("ERROR. Paired alignments are either first or second.")
                    }
                }
                break;

            case "tag":
                tagValue = alignment.tags()[alignmentTrack.colorByTag];
                if (tagValue !== undefined) {

                    if (alignmentTrack.bamColorTag === alignmentTrack.colorByTag) {
                        // UCSC style color option
                        color = "rgb(" + tagValue + ")";
                    }
                    else {
                        color = alignmentTrack.tagColors.getColor(tagValue);
                    }
                }
                break;

            default:
                color = alignmentTrack.parent.color;
        }

        return color;
    }
}