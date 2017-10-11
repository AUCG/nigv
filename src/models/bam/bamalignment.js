export const BAM_MAGIC = 21840194;
export const BAI_MAGIC = 21578050;
export const SECRET_DECODER = ['=', 'A', 'C', 'x', 'G', 'x', 'x', 'x', 'T', 'x', 'x', 'x', 'x', 'x', 'x', 'N'];
export const CIGAR_DECODER = ['M', 'I', 'D', 'N', 'S', 'H', 'P', '=', 'X', '?', '?', '?', '?', '?', '?', '?'];
export const READ_PAIRED_FLAG = 0x1;
export const PROPER_PAIR_FLAG = 0x2;
export const READ_UNMAPPED_FLAG = 0x4;
export const MATE_UNMAPPED_FLAG = 0x8;
export const READ_STRAND_FLAG = 0x10;
export const MATE_STRAND_FLAG = 0x20;
export const FIRST_OF_PAIR_FLAG = 0x40;
export const SECOND_OF_PAIR_FLAG = 0x80;
export const SECONDARY_ALIGNMNET_FLAG = 0x100;
export const READ_FAILS_VENDOR_QUALITY_CHECK_FLAG = 0x200;
export const DUPLICATE_READ_FLAG = 0x400;
export const SUPPLEMENTARY_ALIGNMENT_FLAG = 0x800;

export default class BamAlignment {
	constructor() {
		this.hidden = false;
	}

	isMapped() {
		return (this.flags & READ_UNMAPPED_FLAG) == 0;
	}

	isPaired() {
        return (this.flags & READ_PAIRED_FLAG) != 0;
    }

    isProperPair() {
        return (this.flags & PROPER_PAIR_FLAG) != 0;
    }

    isFirstOfPair() {
        return (this.flags & FIRST_OF_PAIR_FLAG) != 0;
    }

    isSecondOfPair() {
        return (this.flags & SECOND_OF_PAIR_FLAG) != 0;
    }

    isSecondary() {
        return (this.flags & SECONDARY_ALIGNMNET_FLAG) != 0;
    }

    isSupplementary() {
        return (this.flags & SUPPLEMENTARY_ALIGNMENT_FLAG) != 0;
    }

    isFailsVendorQualityCheck() {
        return (this.flags & READ_FAILS_VENDOR_QUALITY_CHECK_FLAG) != 0;
    }

    isDuplicate() {
        return (this.flags & DUPLICATE_READ_FLAG) != 0;
    }

    isMateMapped() {
        return (this.flags & MATE_UNMAPPED_FLAG) == 0;
    }

    isNegativeStrand() {
        return (this.flags & READ_STRAND_FLAG) != 0;
    }

    isMateNegativeStrand() {
        return (this.flags & MATE_STRAND_FLAG) != 0;
    }

    tags() {
        function decodeTags(ba) {

            var p = 0,
                len = ba.length,
                tags = {};

            while (p < len) {
                var tag = String.fromCharCode(ba[p]) + String.fromCharCode(ba[p + 1]);
                var type = String.fromCharCode(ba[p + 2]);
                var value;

                if (type == 'A') {
                    value = String.fromCharCode(ba[p + 3]);
                    p += 4;
                } else if (type === 'i' || type === 'I') {
                    value = _readInt(ba, p + 3);
                    p += 7;
                } else if (type === 'c' || type === 'C') {
                    value = ba[p + 3];
                    p += 4;
                } else if (type === 's' || type === 'S') {
                    value = _readShort(ba, p + 3);
                    p += 5;
                } else if (type === 'f') {
                    value = _readFloat(ba, p + 3);
                    p += 7;
                } else if (type === 'Z') {
                    p += 3;
                    value = '';
                    for (; ;) {
                        var cc = ba[p++];
                        if (cc === 0) {
                            break;
                        } else {
                            value += String.fromCharCode(cc);
                        }
                    }
                } else {
                    //'Unknown type ' + type;
                    value = 'Error unknown type: ' + type;
                    tags[tag] = value;
                    break;
                }
                tags[tag] = value;
            }
            return tags;
        }

        if (!this.tagDict) {
            if (this.tagBA) {
                this.tagDict = decodeTags(this.tagBA);
                this.tagBA = undefined;
            } else {
                this.tagDict = {};  // Mark so we don't try again.  The record has not tags
            }
        }
        return this.tagDict;

    }

    popupData(genomicLocation) {

        // if the user clicks on a base next to an insertion, show just the
        // inserted bases in a popup (like in desktop IGV).
        var nameValues = [], isFirst, tagDict;

        if(this.insertions) {
            for(var i = 0; i < this.insertions.length; i += 1) {
                var ins_start = this.insertions[i].start;
                if(genomicLocation == ins_start || genomicLocation == ins_start - 1) {
                    nameValues.push({name: 'Insertion', value: this.insertions[i].seq });
                    nameValues.push({name: 'Location', value: ins_start });
                    return nameValues;
                }
            }
        }

        nameValues.push({ name: 'Read Name', value: this.readName });

        // Sample
        // Read group
        nameValues.push("<hr>");

        // Add 1 to genomic location to map from 0-based computer units to user-based units
        nameValues.push({ name: 'Alignment Start', value: igv.numberFormatter(1 + this.start), borderTop: true });

        nameValues.push({ name: 'Read Strand', value: (true === this.strand ? '(+)' : '(-)'), borderTop: true });
        nameValues.push({ name: 'Cigar', value: this.cigar });
        nameValues.push({ name: 'Mapped', value: yesNo(this.isMapped()) });
        nameValues.push({ name: 'Mapping Quality', value: this.mq });
        nameValues.push({ name: 'Secondary', value: yesNo(this.isSecondary()) });
        nameValues.push({ name: 'Supplementary', value: yesNo(this.isSupplementary()) });
        nameValues.push({ name: 'Duplicate', value: yesNo(this.isDuplicate()) });
        nameValues.push({ name: 'Failed QC', value: yesNo(this.isFailsVendorQualityCheck()) });

        if (this.isPaired()) {
            nameValues.push("<hr>");
            nameValues.push({ name: 'First in Pair', value: !this.isSecondOfPair(), borderTop: true });
            nameValues.push({ name: 'Mate is Mapped', value: yesNo(this.isMateMapped()) });
            if (this.isMateMapped()) {
                nameValues.push({ name: 'Mate Chromosome', value: this.mate.chr });
                nameValues.push({ name: 'Mate Start', value: (this.mate.position + 1)});
                nameValues.push({ name: 'Mate Strand', value: (true === this.mate.strand ? '(+)' : '(-)')});
                nameValues.push({ name: 'Insert Size', value: this.fragmentLength });
                // Mate Start
                // Mate Strand
                // Insert Size
            }
            // First in Pair
            // Pair Orientation

        }

        nameValues.push("<hr>");
        tagDict = this.tags();
        isFirst = true;
        for (var key in tagDict) {

            if (tagDict.hasOwnProperty(key)) {

                if (isFirst) {
                    nameValues.push({ name: key, value: tagDict[key], borderTop: true });
                    isFirst = false;
                } else {
                    nameValues.push({ name: key, value: tagDict[key] });
                }

            }
        }

        return nameValues;

        function yesNo(bool) {
            return bool ? 'Yes' : 'No';
        }
    }


    _readInt(ba, offset) {
        return (ba[offset + 3] << 24) | (ba[offset + 2] << 16) | (ba[offset + 1] << 8) | (ba[offset]);
    }

    _readShort(ba, offset) {
        return (ba[offset + 1] << 8) | (ba[offset]);
    }

    _readFloat(ba, offset) {

        var dataView = new DataView(ba.buffer),
            littleEndian = true;

        return dataView.getFloat32(offset, littleEndian);
    }
}