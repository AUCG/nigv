import BamFilter from '../../models/bam/bamfilter';
import {ga4ghGet} from './ga4ghhelper';

const BAM_MAGIC = 21840194;
const BAI_MAGIC = 21578050;
const SECRET_DECODER = ['=', 'A', 'C', 'x', 'G', 'x', 'x', 'x', 'T', 'x', 'x', 'x', 'x', 'x', 'x', 'N'];
const CIGAR_DECODER = ['M', 'I', 'D', 'N', 'S', 'H', 'P', '=', 'X', '?', '?', '?', '?', '?', '?', '?'];
const READ_PAIRED_FLAG = 0x1;
const PROPER_PAIR_FLAG = 0x2;
const READ_UNMAPPED_FLAG = 0x4;
const MATE_UNMAPPED_FLAG = 0x8;
const READ_STRAND_FLAG = 0x10;
const MATE_STRAND_FLAG = 0x20;
const FIRST_OF_PAIR_FLAG = 0x40;
const SECOND_OF_PAIR_FLAG = 0x80;
const NOT_PRIMARY_ALIGNMENT_FLAG = 0x100;
const READ_FAILS_VENDOR_QUALITY_CHECK_FLAG = 0x200;
const DUPLICATE_READ_FLAG = 0x400;
const SUPPLEMENTARY_ALIGNMENT_FLAG = 0x800;

const CigarOperationTable = {
        "ALIGNMENT_MATCH": "M",
        "INSERT": "I",
        "DELETE": "D",
        "SKIP": "N",
        "CLIP_SOFT": "S",
        "CLIP_HARD": "H",
        "PAD": "P",
        "SEQUENCE_MATCH": "=",
        "SEQUENCE_MISMATCH": "X"
    }

var igv = null;
export class Ga4ghAlignmentReader{
    constructor(igvInstance, config) {
        igv = igvInstance;
        this.config = config;
        this.url = config.url;
        this.filter = config.filter || new BamFilter();
        this.readGroupSetIds = config.readGroupSetIds;
        this.authKey = config.authKey;   // Might be undefined or nill

        this.samplingWindowSize = config.samplingWindowSize === undefined ? 100 : config.samplingWindowSize;
        this.samplingDepth = config.samplingDepth === undefined ? 100 : config.samplingDepth;
        if (config.viewAsPairs) {
            this.pairsSupported = true;
        }
        else {
            this.pairsSupported = config.pairsSupported === undefined ? true : config.pairsSupported;
        }
    }

    readAlignments(chr, bpStart, bpEnd) {
        //ALIGNMENT_MATCH, INSERT, DELETE, SKIP, CLIP_SOFT, CLIP_HARD, PAD, SEQUENCE_MATCH, SEQUENCE_MISMATCH
        var self = this;

        return new Promise(function (fulfill, reject) {
            getChrNameMap().then(function (chrNameMap) {
                var queryChrId = chrNameMap.hasOwnProperty(chr) ? chrNameMap[chr] : chr,
                    readURL = self.url + "/reads/search/";

                ga4ghSearch(igv, {
                    url: readURL,
                    body: {
                        "read_group_ids": chrNameMap.read_group_ids,
                        
                        // ga4gh 需要reference_id(染色体在数据库中的id，不是染色体的名字)
                        "reference_id": queryChrId,
                        "start": bpStart,
                        "end": bpEnd,
                        "page_size": "1000"
                    },
                    decode: decodeGa4ghReads,
                    results: new igv.AlignmentContainer(chr, bpStart, bpEnd, self.samplingWindowSize, self.samplingDepth, self.pairsSupported)
                }).then(fulfill)
                    .catch(reject);

            }).catch(reject);

            function getChrNameMap() {
                return new Promise(function (fulfill, reject) {
                    if (self.chrNameMap) {
                        fulfill(self.chrNameMap);
                    }

                    else {
                        self.readMetadata().then(function (json) {
                            self.chrNameMap = {};

                            if (self.config.referenceSetId || (igv.browser && json.read_groups && json.read_groups.length > 0)) {

                                var referenceSetId = json.read_groups[0].reference_set_id || self.config.referenceSetId;
                                var read_group_ids = json.read_groups.map(function(r){return r.id;});
                                self.chrNameMap['read_group_ids'] = read_group_ids;

                                if(!self.config.referenceSetId){
                                    console.log("No reference set specified");
                                }

                                if (referenceSetId) {
                                        // Query for reference names to build an alias table (map of genome ref names -> dataset ref names)
                                        var readURL = self.url + "/references/search/";
                                        ga4ghSearch(igv, {
                                            url: readURL,
                                            body: {
                                                "reference_set_id": referenceSetId
                                            },
                                            decode: function (j) {
                                                return j.references;
                                            }
                                        }).then(function (references) {
                                            references.forEach(function (ref) {
                                                var refName = ref.name;
                                                var refId = ref.id;
                                                var alias = igv.browser.genome.getChromosomeName(refName);
                                                self.chrNameMap[alias] = refId;
                                            });
                                            fulfill(self.chrNameMap);

                                        }).catch(reject);
                                }
                                else {

                                    // Try hardcoded constants -- workaround for non-compliant data at Google
                                    this.populateChrNameMap(self.chrNameMap, self.config.datasetId);

                                    fulfill(self.chrNameMap);
                                }
                            }

                            else {
                                // No browser object, can't build map.  This can occur when run from unit tests
                                fulfill(self.chrNameMap);
                            }
                        }).catch(reject);
                    }

                });
            }

                


            /**
             * Decode an array of ga4gh read records
             *

             */
            function decodeGa4ghReads(json) {
                var i,
                    jsonRecords = json.alignments,
                    len = jsonRecords.length,
                    json,
                    blocks,
                    alignment,
                    jsonAlignment,
                    cigarDecoded,
                    alignments = [],
                    genome = igv.browser.genome,
                    mate;

                for (i = 0; i < len; i++) {
                    json = jsonRecords[i];

                    alignment = new igv.BamAlignment();

                    alignment.readName = json.fragment_name;
                    alignment.properPlacement = !json.improper_placement;
                    alignment.duplicateFragment = json.duplicate_fragment;
                    alignment.numberReads = json.number_reads;
                    alignment.fragmentLength = json.fragment_length;
                    alignment.readNumber = json.read_number;
                    alignment.failedVendorQualityChecks = json.failed_vendor_quality_checks;
                    alignment.secondaryAlignment = json.secondary_alignment;
                    alignment.supplementaryAlignment = json.supplementary_alignment;
                    alignment.seq = json.aligned_sequence;
                    alignment.qual = json.aligned_quality;
                    alignment.matePos = json.next_mate_position;
                    alignment.tagDict = json.attributes;
                    alignment.flags = encodeFlags(json);

                    // TODO: 将strand由字符串专为boolean或者undefined
                    function booleanStrand(strand){
                        if ( strand == 'POS_STRAND' || strand == '1' || strand == true || strand == '+'){
                            return true;
                        }
                        if (strand == 'POS_STRAND' || strand == '2' || strand == false || strand == '-'){
                            return false;
                        }
                        return undefined;
                    }

                    jsonAlignment = json.alignment;
                    if (jsonAlignment) {
                        alignment.mapped = true;

                        alignment.chr = json.alignment.position.reference_name;
                        if (genome) alignment.chr = genome.getChromosomeName(alignment.chr);

                        alignment.start = parseInt(json.alignment.position.position);
                        alignment.strand = booleanStrand(json.alignment.position.strand);
                        alignment.mq = json.alignment.mapping_quality;
                        alignment.cigar = encodeCigar(json.alignment.cigar);
                        cigarDecoded = translateCigar(json.alignment.cigar);

                        alignment.lengthOnRef = cigarDecoded.lengthOnRef;

                        blocks = makeBlocks(alignment, cigarDecoded.array);
                        alignment.blocks = blocks.blocks;
                        alignment.insertions = blocks.insertions;
                    }
                    else {
                        alignment.mapped = false;
                    }

                    mate = json.next_mate_position;

                    if (mate) {
                        alignment.mate = {
                            // TODO: ga4gh vs. google
                            chr: mate.referenceName || mate.reference_name,
                            position: parseInt(mate.position),
                            strand: booleanStrand(mate.strand)
                        };
                    }

                    if (self.filter.pass(alignment)) {
                        alignments.push(alignment);
                    }
                }

                return alignments;

                // Encode a cigar string -- used for popup text
                function encodeCigar(cigarArray) {

                    var cigarString = "";
                    cigarArray.forEach(function (cigarUnit) {
                        var op = CigarOperationTable[cigarUnit.operation],
                            // TODO: ga4gh vs. google
                            len = cigarUnit.operationLength || cigarUnit.operation_length;
                        cigarString = cigarString + (len + op);
                    });

                    return cigarString;
                }

                // TODO -- implement me
                function encodeFlags(json) {
                    return 0;
                }

                function translateCigar(cigar) {

                    var cigarUnit, opLen, opLtr,
                        lengthOnRef = 0,
                        cigarArray = [],
                        i;

                    for (i = 0; i < cigar.length; i++) {

                        cigarUnit = cigar[i];

                        opLtr = CigarOperationTable[cigarUnit.operation];
                        // TODO: ga4gh vs. google
                        opLen = cigarUnit.operationLength || cigarUnit.operation_length;  // ga4gh的类型是long
                        opLen = parseInt(opLen);

                        if (opLtr === 'M' || opLtr === 'EQ' || opLtr === 'X' || opLtr === 'D' || opLtr === 'N' || opLtr === '=')
                            lengthOnRef += opLen;

                        cigarArray.push({len: opLen, ltr: opLtr});

                    }

                    return {lengthOnRef: lengthOnRef, array: cigarArray};
                }


                /**
                 * Split the alignment record into blocks as specified in the cigarArray.  Each aligned block contains
                 * its portion of the read sequence and base quality strings.  A read sequence or base quality string
                 * of "*" indicates the value is not recorded.  In all other cases the length of the block sequence (block.seq)
                 * and quality string (block.qual) must == the block length.
                 *
                 * NOTE: Insertions are not yet treated // TODO
                 *
                 * @param record
                 * @param cigarArray
                 * @returns array of blocks
                 */
                function makeBlocks(record, cigarArray) {
                    var blocks = [],
                        insertions,
                        seqOffset = 0,
                        pos = record.start,
                        len = cigarArray.length,
                        blockSeq,
                        gapType,
                        blockQuals;

                    for (var i = 0; i < len; i++) {

                        var c = cigarArray[i];

                        switch (c.ltr) {
                            case 'H' :
                                break; // ignore hard clips
                            case 'P' :
                                break; // ignore pads
                            case 'S' :
                                seqOffset += c.len;
                                gapType = 'S';
                                break; // soft clip read bases
                            case 'N' :
                                pos += c.len;
                                gapType = 'N';
                                break;  // reference skip
                            case 'D' :
                                pos += c.len;
                                gapType = 'D';
                                break;
                            case 'I' :
                                blockSeq = record.seq === "*" ? "*" : record.seq.substr(seqOffset, c.len);
                                blockQuals = record.qual ? record.qual.slice(seqOffset, c.len) : undefined;
                                if (insertions === undefined) insertions = [];
                                insertions.push({start: pos, len: c.len, seq: blockSeq, qual: blockQuals});
                                seqOffset += c.len;
                                break;
                            case 'M' :
                            case 'EQ' :
                            case '=' :
                            case 'X' :
                                blockSeq = record.seq === "*" ? "*" : record.seq.substr(seqOffset, c.len);
                                blockQuals = record.qual ? record.qual.slice(seqOffset, c.len) : undefined;
                                blocks.push({start: pos, len: c.len, seq: blockSeq, qual: blockQuals, gapType: c.ltr});
                                seqOffset += c.len;
                                pos += c.len;

                                break;

                            default :
                                console.log("Error processing cigar element: " + c.len + c.ltr);
                        }
                    }

                    return {blocks: blocks, insertions: insertions};
                }
            }


        });
    }


    readMetadata() {
        return ga4ghGet(igv, {
            url: this.url,
            entity: "readgroupsets",
            entityId: this.readGroupSetIds
        });
    }

    /**
     * Hardcoded hack to work around some non-compliant google datasets
     *
     * @param chrNameMap
     * @param datasetId
     */
    populateChrNameMap(chrNameMap, datasetId) {
        var i;
        if ("461916304629" === datasetId || "337315832689" === datasetId) {
            for (i = 1; i < 23; i++) {
                chrNameMap["chr" + i] = i;
            }
            chrNameMap["chrX"] = "X";
            chrNameMap["chrY"] = "Y";
            chrNameMap["chrM"] = "MT";
        }
    }
}


export function decodeGa4ghReadset(json) {
    var sequenceNames = [],
        fileData = json["fileData"];

    fileData.forEach(function (fileObject) {
        var refSequences = fileObject["refSequences"];
        refSequences.forEach(function (refSequence) {
            sequenceNames.push(refSequence["name"]);
        });
    });

    return sequenceNames;
}