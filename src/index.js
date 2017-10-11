import IGV from './igv';
import './styles/igv.css';
import './styles/opentip.css';
import 'font-awesome/css/font-awesome.css';

// run igv here
const div = '#igvDom';
const ACCESS_KEY_ID = 'ub1tMZaZ7cgE8XeT/vVDTA==';
const ACCESS_KEY_SECRET = 'JA7wKqiJPiNUc891LkTmgTwzlTU=';
const BASE_ADDRESS = 'http://101.200.179.220:8022';
const ACCOUNT = 'genedock';
const PROJECT = 'default';
const URL = BASE_ADDRESS + '/accounts/'+ACCOUNT+ '/projects/' + PROJECT;
const variantSetId = 'WyJnZW5lZG9jayIsInZzIiwiZ2VuZWRvY2s6L2hvbWUvYWRtaW4vdGVzdC52Y2YiXQ==';
const referenceSetId = 'WyJnZW5lZG9jazovaG9tZS9hZG1pbi9odW1hbl9nMWtfdjM3LmZhc3RhIl0=';
const readGroupSetIds = 'WyJnZW5lZG9jayIsInJncyIsImdlbmVkb2NrOi90ZXN0LmJhbSJd';
const genome = "GRCh37";
const locus = "chr6:100,367,933-100,369,495"; // 或者 6:100367933-100369495

const options = {
	    // Required for genedock genomics API header
	    access_key_id: ACCESS_KEY_ID,
	    access_key_secret: ACCESS_KEY_SECRET,
	    base_address: BASE_ADDRESS,

	    // IGV default configuration
	    palette: ["#00A0B0", "#6A4A3C", "#CC333F", "#EB6841"],
	    locus: locus,
	    genome: genome,
	    showRuler: true,
	    tracks: [
	        {
	            sourceType: 'ga4gh',
	            type: 'variant',
	            url: URL,
	            variantSetId: variantSetId,
	            name: 'Ga4gh variants',
	            visibilityWindow: 1000000,
	            displayMode: "EXPANDED"
	        },
	        {
	            sourceType: 'ga4gh',
	            type: 'alignment',
	            url: URL,
	            // 由于后端导入文件时没有关联bam和ref，此处hard code
	            referenceSetId: referenceSetId,
	            readGroupSetIds: readGroupSetIds,
	            name: 'Ga4gh alignments',
	            visibilityWindow: 1000000,
	            colorBy: 'strand'
	        }
	    ]
	};

const igv = new IGV(div, options);
const igvn = new IGV(div, options);

console.log(igv == igvn);
