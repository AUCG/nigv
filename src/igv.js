import jQuery from 'jquery';
import 'jquery-ui/ui/widgets/draggable';
import 'jquery-ui/themes/base/draggable.css';
import * as _ from 'underscore';
import 'inflate';

import Browser from './utils/browser';
import GeneDock from './utils/genedock.js';
import TrackFileLoad from './utils/trackfileload';
import WindowSizePanel from './utils/windowsizepanel';
import {makeToggleButton, presentAlert} from './utils/utils';
import IdeoPanel from './utils/ideopanel';

import CenterGuide from './views/centerguide';
import UserFeedback from './views/userfeedback';
import Popover from './views/popover';
import ColorPicker from './views/colorpicker';
import AlertDialog from './views/alertdialog';
import {Dialog, dialogConstructor} from './views/dialog';
import DataRangeDialog from './views/datarangedialog';

import BamAlignment from './models/bam/bamalignment';
import BamFilter from './models/bam/utils/bamfilter';
import AlignmentContainer from './models/bam/alignmentcontainer';
import BamAlignmentRow from './models/bam/bamalignmentrow';
import KaryoPanel from './models/karyo/karyopanel';
import {loadGenome} from './models/genome';
import ReferenceFrame from './models/referenceframe';

import BAMTrack from './tracks/bam/bamtrack';
import {RulerTrack} from './tracks/rule/ruletrack';


const $ = jQuery;

const igvjs_version = "beta";
const version = igvjs_version;

var igv = null;
export default class IGV {
    /**
     * Create an igv.browser instance.  This object defines the public API for interacting with the genome browser.
     *
     * @param parentDiv - DOM tree root
     * @param config - configuration options.
     *
     */
    constructor(parentDiv, config) {
        let $content, $header, browser;

        // 避免igv对象被重复创建
        if (igv) {
            console.log("Attempt to create 2 browsers.");
            // igv.removeBrowser();
            return igv;
        }

        // 创建igv对象，用于挂载基因组浏览器的所有方法和属性
        igv = {};

        this.setDefaults(config);
        this.setTrackOrder(config);

        // 挂载配置数据
        igv.config = config;

        // 挂载browser
        browser = new Browser(igv, $('<div class="igv-track-container-div">')[0]);

        $(parentDiv).append(browser.$root);

        // drag & drop
        browser.trackFileLoad = new TrackFileLoad();
        browser.$root.append(browser.trackFileLoad.$container);
        browser.trackFileLoad.$container.hide();

        this.setControls(browser, config);

        $content = $('<div class="igv-content-div">');
        browser.$root.append($content);

        $header = $('<div id="igv-content-header">');
        $content.append($header);

        $content.append(browser.trackContainerDiv);

        // user feedback
        browser.userFeedback = new UserFeedback($content);
        browser.userFeedback.hide();

        // Popover object -- singleton shared by all components
        igv.popover = new Popover(igv, $content);

        // ColorPicker object -- singleton shared by all components
        igv.colorPicker = new ColorPicker(browser.$root, config.palette);
        igv.colorPicker.hide();

        // alert object -- singleton shared by all components
        igv.alert = new AlertDialog(browser.$root, "igv-alert");
        igv.alert.hide();

        // Dialog object -- singleton shared by all components
        igv.dialog = new Dialog(browser.$root, dialogConstructor);
        igv.dialog.hide();

        // Data Range Dialog object -- singleton shared by all components
        igv.dataRangeDialog = new DataRangeDialog(igv, browser.$root);
        igv.dataRangeDialog.hide();

        if (!config.showNavigation) {
            $header.append($('<div class="igv-logo-nonav">'));
        }

        // Deal with legacy genome definition options
        this.setReferenceConfiguration(config);

        new loadGenome(igv, config.reference).then((genome) => {
            let width;
            igv.browser.genome = genome;
            igv.browser.genome.id = config.reference.genomeId;

            width = igv.browser.viewportContainerWidth();
            igv.browser.getGenomicStateList(this._lociWithConfiguration(config), width, (genomicStateList) => {

                var errorString,
                    found,
                    gs;

                if (_.size(genomicStateList) > 0) {

                    igv.browser.genomicStateList = _.map(genomicStateList, (genomicState, index) => {
                        genomicState.locusIndex = index;
                        genomicState.locusCount = _.size(genomicStateList);
                        genomicState.referenceFrame = new ReferenceFrame(genomicState.chromosome.name, genomicState.start, (genomicState.end - genomicState.start) / (width / genomicState.locusCount));
                        genomicState.initialReferenceFrame = new ReferenceFrame(genomicState.chromosome.name, genomicState.start, (genomicState.end - genomicState.start) / (width / genomicState.locusCount));
                        return genomicState;
                    });

                    igv.browser.updateLocusSearchWithGenomicState(_.first(igv.browser.genomicStateList));

                    igv.browser.zoomWidgetLayout();

                    // igv.browser.toggleCursorGuide(igv.browser.genomicStateList);
                    igv.browser.toggleCenterGuide(igv.browser.genomicStateList);

                    if (igv.browser.karyoPanel) {
                        igv.browser.karyoPanel.resize();
                    }

                    if (true === config.showIdeogram) {
                        igv.browser.ideoPanel = new IdeoPanel(igv, $header);
                        igv.browser.ideoPanel.repaint();
                    }

                    if (config.showRuler) {
                        igv.browser.rulerTrack = new RulerTrack(igv);
                        igv.browser.addTrack(igv.browser.rulerTrack);
                    }

                    if (config.tracks) {
                        igv.browser.loadTracksWithConfigList(config.tracks);

                        igv.browser.windowSizePanel.updateWithGenomicState(_.first(igv.browser.genomicStateList));
                    }

                } else {
                    errorString = 'Unrecognized locus ' + _lociWithConfiguration(config);
                    presentAlert(igv, errorString);
                }

            });
        }).catch(function (error) {
            presentAlert(igv, error);
            console.log(error);
        });

        igv.config = config;
        return browser;
    };

    _lociWithConfiguration(configuration) {
        var loci = [];

        if (configuration.locus) {

            if (Array.isArray(configuration.locus)) {
                _.each(configuration.locus, function (l) {
                    loci.push(l);
                });

            } else {
                loci.push(configuration.locus);
            }
        }

        if (0 === _.size(loci)) {
            loci.push(_.first(igv.browser.genome.chromosomeNames));
        }

        return loci;
    }

    setTrackOrder(conf) {
        var trackOrder = 1;
        if (conf.tracks) {
            conf.tracks.forEach(function (track) {
                if (track.order === undefined) {
                    track.order = trackOrder++;
                }
            });
        }
    }

    setReferenceConfiguration(conf) {
        if (conf.genome) {
            conf.reference = this._expandGenome(conf.genome);
        }
        else if (conf.fastaURL) {   // legacy property
            conf.reference = {
                fastaURL: conf.fastaURL,
                cytobandURL: conf.cytobandURL
            }
        }
        else if (conf.reference && conf.reference.id !== undefined && conf.reference.fastaURL === undefined) {
            conf.reference = this._expandGenome(conf.reference.id);
        }

        if (!(conf.reference && conf.reference.fastaURL)) {
            //alert("Fatal error:  reference must be defined");
            presentAlert(igv, "Fatal error:  reference must be defined");
            throw new Error("Fatal error:  reference must be defined");
        }
    }

    /**
     * Expands ucsc type genome identifiers to genome object.
     *
     * @param genomeId
     * @returns {{}}
     */
    _expandGenome(genomeId) {

        var reference = {id: genomeId};

        switch (genomeId) {

            case "hg18":
                reference.fastaURL = "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg18/hg18.fasta";
                reference.cytobandURL = "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg18/cytoBand.txt.gz";
                break;
            case "GRCh38":
            case "hg38":
                reference.fastaURL = "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg38/hg38.fa";
                reference.cytobandURL = "https://s3.amazonaws.com/igv.broadinstitute.org/annotations/hg38/cytoBandIdeo.txt";
                break;
            case "hg19":
            case "GRCh37":
                reference.fastaURL = "http://gdclient.oss-cn-beijing.aliyuncs.com/reference/human_g1k_v37.fasta";
                reference.indexURL = "http://gdclient.oss-cn-beijing.aliyuncs.com/reference/human_g1k_v37.fasta.fai";
                reference.cytobandURL = "http://gdclient.oss-cn-beijing.aliyuncs.com/reference/cytoBand.txt";
                break;
            case "mm10":
            case "GRCm38":
                reference.fastaURL = "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/mm10/mm10.fa";
                reference.indexURL = "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/mm10/mm10.fa.fai";
                reference.cytobandURL = "https://s3.amazonaws.com/igv.broadinstitute.org/annotations/mm10/cytoBandIdeo.txt.gz";
                break;
            default:
                presentAlert("Uknown genome id: " + genomeId);
        }
        return reference;
    }

    setControls(browser, conf) {
        var controlDiv;

        // Create controls.  This can be customized by passing in a function, which should return a div containing the
        // controls

        if (conf.showCommandBar !== false && conf.showControls !== false) {
            controlDiv = conf.createControls ? conf.createControls(browser, conf) : this.createStandardControls(browser, conf);
            browser.$root.append($(controlDiv));
        }
    }

    createStandardControls(browser, config) {
        let $igvLogo,
            $karyo,
            $navigation,
            $searchContainer,
            $faSearch;

        const $controls = $('<div id="igvControlDiv">');

        if (config.showNavigation) {
            $navigation = $('<div class="igv-navbar">');
            $controls.append($navigation);

            // IGV logo
            $igvLogo = $('<div class="igv-logo">');
            $navigation.append($igvLogo);

            // load local file
            $navigation.append(browser.trackFileLoad.$presentationButton);
            if (true === config.showLoadFileWidget) {
                browser.trackFileLoad.$presentationButton.show();
            } else {
                browser.trackFileLoad.$presentationButton.hide();
            }

            // search container
            $searchContainer = $('<div class="igv-search-container">');

            browser.$searchInput = $('<input type="text" placeholder="Locus Search">');

            browser.$searchInput.change((e) => {
                const value = $(e.target).val();
                browser.parseSearchInput(value);
            });

            $faSearch = $('<i class="fa fa-search">');

            $faSearch.click(() => {
                browser.parseSearchInput(browser.$searchInput.val());
            });

            $searchContainer.append(browser.$searchInput);
            $searchContainer.append($faSearch);

            // search results presented in table
            browser.$searchResults = $('<div class="igv-search-results">');
            browser.$searchResultsTable = $('<table>');

            browser.$searchResults.append(browser.$searchResultsTable.get(0));

            $searchContainer.append(browser.$searchResults.get(0));

            browser.$searchResults.hide();

            $navigation.append($searchContainer);


            // window size panel
            browser.windowSizePanel = new WindowSizePanel(igv, $navigation);

            // zoom widget
            this.zoomWidget(browser, $navigation);

            // cursor tracking guide
            browser.$cursorTrackingGuide = $('<div class="igv-cursor-tracking-guide">');
            $(browser.trackContainerDiv).append(browser.$cursorTrackingGuide);

            if (true === config.showCursorTrackingGuide) {
                browser.$cursorTrackingGuide.show();
            } else {
                browser.$cursorTrackingGuide.hide();
            }

            browser.$cursorTrackingGuideToggle = makeToggleButton(igv, 'cursor guide', 'cursor guide', 'showCursorTrackingGuide', () => {
                return browser.$cursorTrackingGuide;
            }, undefined);

            $navigation.append(browser.$cursorTrackingGuideToggle);

            // one base wide center guide
            browser.centerGuide = new CenterGuide(igv, $(browser.trackContainerDiv), config);

            $navigation.append(browser.centerGuide.$centerGuideToggle);

            // toggle track labels
            browser.$trackLabelToggle = makeToggleButton(igv, 'track labels', 'track labels', 'trackLabelsVisible', () => {
                return $(browser.trackContainerDiv).find('.igv-track-label');
            }, undefined);

            $navigation.append(browser.$trackLabelToggle);
        }

        $karyo = $('#igvKaryoDiv');
        if (undefined === $karyo.get(0)) {
            $karyo = $('<div id="igvKaryoDiv" class="igv-karyo-div">');
            $controls.append($karyo);
        }
        browser.karyoPanel = new KaryoPanel(igv, $karyo, config);

        $navigation.append(browser.karyoPanel.$karyoPanelToggle);

        if (false === config.showKaryo) {
            browser.karyoPanel.$karyoPanelToggle.hide();
            $karyo.hide();
        }

        return $controls.get(0);
    }

    zoomWidget(browser, $parent) {
        var $fa;
        browser.$zoomContainer = $('<div class="igv-zoom-widget">');
        $parent.append(browser.$zoomContainer);

        $fa = $('<i class="fa fa-minus-circle">');
        browser.$zoomContainer.append($fa);
        $fa.on('click',  () => {
            browser.zoomOut();
        });


        $fa = $('<i class="fa fa-plus-circle">');
        browser.$zoomContainer.append($fa);
        $fa.on('click', () => {
            browser.zoomIn();
        });
    }

    setDefaults(config) {
        if (undefined === config.showLoadFileWidget) {
            config.showLoadFileWidget = false;
        }

        if (undefined === config.minimumBases) {
            config.minimumBases = 40;
        }

        if (undefined === config.showIdeogram) {
            config.showIdeogram = true;
        }

        if (undefined === config.showCursorTrackingGuide) {
            config.showCursorTrackingGuide = false;
        }

        if (undefined === config.showCenterGuide) {
            config.showCenterGuide = false;
        }

        if (undefined === config.showKaryo) {
            config.showKaryo = false;
        }

        if (undefined === config.trackLabelsVisible) {
            config.trackLabelsVisible = true;
        }

        if (config.showControls === undefined) {
            config.showControls = true;
        }

        if (config.showNavigation === undefined) {
            config.showNavigation = true;
        }

        if (config.showRuler === undefined) {
            config.showRuler = true;
        }

        if (config.showSequence === undefined) {
            config.showSequence = true;
        }

        if (config.flanking === undefined) {
            config.flanking = 1000;
        }
        if (config.pairsSupported === undefined) {
            config.pairsSupported = true;
        }

        if (config.type === undefined) {
            config.type = "IGV";
        }

        if (!config.tracks) {
            config.tracks = [];
        }

        if (config.showSequence) {
            config.tracks.push({type: "sequence", order: -9999});
        }
    }

    removeBrowser() {
        igv.browser.$root.remove();
        $(".igv-grid-container-colorpicker").remove();
        $(".igv-grid-container-dialog").remove();
        // $(".igv-grid-container-dialog").remove();
    }

    version() {
        return version;
    }
}