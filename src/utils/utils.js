import jQuery from 'jquery';
import * as _ from 'underscore';
const $ = jQuery;

export function getExtension(config) {
    var path,
        filename,
        index;

    if (undefined === config.url) {
        return undefined;
    }

    path = isFilePath(config.url) ? config.url.name : config.url;
    filename = path.toLowerCase();

    //Strip parameters -- handle local files later
    index = filename.indexOf("?");
    if (index > 0) {
        filename = filename.substr(0, index);
    }

    //Strip aux extensions .gz, .tab, and .txt
    if (filename.endsWith(".gz")) {
        filename = filename.substr(0, filename.length - 3);
    } else if (filename.endsWith(".txt") || filename.endsWith(".tab")) {
        filename = filename.substr(0, filename.length - 4);
    }

    index = filename.lastIndexOf(".");

    return index < 0 ? filename : filename.substr(1 + index);
}

export function geneNameLookupPathTemplate(genomeId) {
    var path;
    // TODO: 基因名查询
    path = 'https://portals.broadinstitute.org/webservices/igv/locus?genome=' + genomeId + '&name=$FEATURE$';
    return path;
}

export function geneNameLookupServicePromise(name, genomeId) {
    var pathTemplate,
        path;

    pathTemplate = igv.geneNameLookupPathTemplate(genomeId);
    path = pathTemplate.replace("$FEATURE$", name);
    return igvxhr.loadString(path);
}

export function filenameOrURLHasSuffix(fileOrURL, suffix) {
    var str = (fileOrURL instanceof File) ? fileOrURL.name : fileOrURL;
    return str.toLowerCase().endsWith( suffix )
}

export function isFilePath(path) {
    return (path instanceof File);
}

export function makeToggleButton(igv, buttonOnLabel, buttonOffLabel, configurationKey, get$Target, continuation) {
    const $button = $('<div class="igv-nav-bar-toggle-button">');

    skin$ButtonWithTruthFunction($button, (true === igv.config[ configurationKey ]), buttonOnLabel, buttonOffLabel);

    $button.click(function () {
        var $target = get$Target();
        igv.config[ configurationKey ] = !igv.config[ configurationKey ];
        $target.toggle();
        skin$ButtonWithTruthFunction($(this), $target.is(":visible"), buttonOnLabel, buttonOffLabel);
    });

    function skin$ButtonWithTruthFunction($b, truth, onLabel, offLabel) {
        $b.removeClass('igv-nav-bar-toggle-button-on');
        $b.removeClass('igv-nav-bar-toggle-button-off');
        if (true === truth) {
            $b.addClass('igv-nav-bar-toggle-button-off');
            $b.text(offLabel);

            if (continuation) {
                continuation();
            }
        } else {
            $b.addClass('igv-nav-bar-toggle-button-on');
            $b.text(onLabel);
        }
    }
    return $button;
}

export function presentAlert (igv, string) {
    igv.alert.$dialogLabel.text(string);
    igv.alert.show(undefined);
    igv.popover.hide();
}

export function attachDialogCloseHandlerWithParent($parent, closeHandler) {
    var $container = $('<div>'),
        $fa = $('<i class="fa fa-times">');

    $container.append($fa);
    $parent.append($container);

    $fa.hover(
        function () {
            $fa.removeClass("fa-times");
            $fa.addClass("fa-times-circle");

            $fa.css({
                color:"#222"
            });
        },

        function () {
            $fa.removeClass("fa-times-circle");
            $fa.addClass("fa-times");

            $fa.css({
                color:"#444"
            });

        }
    );

    $fa.click(closeHandler);
}

export function spinner(size) {
    // spinner
    var $container,
        $spinner;

    $spinner = $('<i class="fa fa-spinner fa-spin">');
    if (size) {
        $spinner.css("font-size", size);
    }

    $container = $('<div class="igv-spinner-container">');
    $container.append($spinner[0]);

    return $container[0];
}

/**
 * Find spinner
 */
export function getSpinnerObjectWithParentElement(parentElement) {
    return $(parentElement).find("div.igv-spinner-container");
}

/**
 * Start the spinner for the parent element, if it has one
 */
export function startSpinnerAtParentElement(igv, parentElement) {
    var spinnerObject = igv.getSpinnerObjectWithParentElement(parentElement);

    if (spinnerObject) {
        spinnerObject.show();
    }
}

/**
 * Stop the spinner for the parent element, if it has one
 * @param parentElement
 */
export function stopSpinnerAtParentElement(igv, parentElement) {
    var spinnerObject = igv.getSpinnerObjectWithParentElement(parentElement);
    if (spinnerObject) {
        spinnerObject.hide();
    }
}

export function parseUri(igv, str) {
    const options = {
            strictMode: false,
            key: ["source", "protocol", "authority", "userInfo", "user", "password", "host", "port", "relative", "path", "directory", "file", "query", "anchor"],
            q: {
                name: "queryKey",
                parser: /(?:^|&)([^&=]*)=?([^&]*)/g
            },
            parser: {
                strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
                loose: /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
            }
        }
    var o = igv.parseUri.options,
        m = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
        uri = {},
        i = 14;

    while (i--) uri[o.key[i]] = m[i] || "";

    uri[o.q.name] = {};
    uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
        if ($1) uri[o.q.name][$1] = $2;
    });

    return uri;
}


export function domElementRectAsString(element) {
    return " x " + element.clientLeft + " y " + element.clientTop + " w " + element.clientWidth + " h " + element.clientHeight;
}

export function isNumber(n) {

    if ("" === n) {

        return false
    } else if (undefined === n) {

        return false;
    } else {

        return !isNaN(parseFloat(n)) && isFinite(n);
    }

};

export function guid() {
    return ("0000" + (Math.random() * Math.pow(36, 4) << 0).toString(36)).slice(-4);
};

// Returns a random number between min (inclusive) and max (exclusive)
export function random(min, max) {
    return Math.random() * (max - min) + min;
};

export function prettyBasePairNumber(raw) {

    var denom,
        units,
        value,
        floored;

    if (raw > 1e7) {
        denom = 1e6;
        units = " mb";
    } else if (raw > 1e4) {

        denom = 1e3;
        units = " kb";

        value = raw/denom;
        floored = Math.floor(value);
        return igv.numberFormatter(floored) + units;
    } else {
        return igv.numberFormatter(raw) + " bp";
    }

    value = raw/denom;
    floored = Math.floor(value);

    return floored.toString() + units;
};

// StackOverflow: http://stackoverflow.com/a/10810674/116169
export function numberFormatter(rawNumber) {

    var dec = String(rawNumber).split(/[.,]/),
        sep = ',',
        decsep = '.';

    return dec[0].split('').reverse().reduce(function (prev, now, i) {
            return i % 3 === 0 ? prev + sep + now : prev + now;
        }).split('').reverse().join('') + (dec[1] ? decsep + dec[1] : '');
};

export function numberUnFormatter(formatedNumber) {
    return formatedNumber.split(",").join().replace(",", "", "g");
}

/**
 * Translate the mouse coordinates for the event to the coordinates for the given target element
 * @param e
 * @param target
 * @returns {{x: number, y: number}}
 */
export function translateMouseCoordinates(e, target) {

    var $target = $(target),
        eFixed,
        posx,
        posy;

    // Sets pageX and pageY for browsers that don't support them
    eFixed = $.event.fix(e);

    if (undefined === $target.offset()) {
        console.log('igv.translateMouseCoordinates - $target.offset() is undefined.');
    }
    posx = eFixed.pageX - $target.offset().left;
    posy = eFixed.pageY - $target.offset().top;

    return {x: posx, y: posy}
}

/**
 * Format markup for popover text from an array of name value pairs [{name, value}]
 */
export function formatPopoverText(nameValueArray) {

    var markup = "<table class=\"igv-popover-table\">";

    nameValueArray.forEach(function (nameValue) {

        if (nameValue.name) {
            markup += "<tr><td class=\"igv-popover-td\">" + "<div class=\"igv-popover-name-value\">" + "<span class=\"igv-popover-name\">" + nameValue.name + "</span>" + "<span class=\"igv-popover-value\">" + nameValue.value + "</span>" + "</div>" + "</td></tr>";
        } else {
            // not a name/value pair
            markup += "<tr><td>" + nameValue.toString() + "</td></tr>";
        }
    });

    markup += "</table>";
    return markup;


};

export function throttle(fn, threshhold, scope) {
    threshhold || (threshhold = 200);
    var last, deferTimer;

    return function () {
        var context = scope || this;

        var now = +new Date,
            args = arguments;
        if (last && now < last + threshhold) {
            // hold on to it
            clearTimeout(deferTimer);
            deferTimer = setTimeout(function () {
                last = now;
                fn.apply(context, args);
            }, threshhold);
        } else {
            last = now;
            fn.apply(context, args);
        }
    }
}

export function splitStringRespectingQuotes(string, delim) {

    var tokens = [],
        len = string.length,
        i,
        n = 0,
        quote = false,
        c;

    if (len > 0) {

        tokens[n] = string.charAt(0);
        for (i = 1; i < len; i++) {
            c = string.charAt(i);
            if (c === '"') {
                quote = !quote;
            }
            else if (!quote && c === delim) {
                n++;
                tokens[n] = "";
            }
            else {
                tokens[n] += c;
            }
        }
    }
    return tokens;
}

/**
 * Extend jQuery's ajax function to handle binary requests.   Credit to Henry Algus:
 *
 * http://www.henryalgus.com/reading-binary-files-using-jquery-ajax/
 */
export function addAjaxExtensions() {

    // use this transport for "binary" data type
    $.ajaxTransport("+binary", function (options, originalOptions, jqXHR) {

        return {
            // create new XMLHttpRequest
            send: function (_, callback) {
                // setup all variables
                var xhr = new XMLHttpRequest(),
                    url = options.url,
                    type = options.type,
                    responseType = "arraybuffer",
                    data = options.data || null;

                xhr.addEventListener('load', function () {
                    var data = {};
                    data[options.dataType] = xhr.response;
                    // make callback and send data
                    callback(xhr.status, xhr.statusText, data, xhr.getAllResponseHeaders());
                });

                xhr.open(type, url);
                xhr.responseType = responseType;

                if (options.headers) {
                    for (var prop in options.headers) {
                        if (options.headers.hasOwnProperty(prop)) {
                            xhr.setRequestHeader(prop, options.headers[prop]);
                        }
                    }
                }

                // TODO -- set any other options values
            },
            abort: function () {
                jqXHR.abort();
            }
        };

    });
}

/**
 * Test if the given value is a string or number.  Not using typeof as it fails on boxed primitives.
 *
 * @param value
 * @returns boolean
 */
export function isStringOrNumber(value) {
    return (value.substring || value.toFixed) ? true : false
};

export function constrainBBox($child, $parent) {

    var delta,
        topLeft,
        bboxChild = {},
        bboxParent = {};

    bboxParent.left = bboxParent.top = 0;
    bboxParent.right = $parent.outerWidth();
    bboxParent.bottom = $parent.outerHeight();

    topLeft = $child.offset();

    bboxChild.left = topLeft.left - $parent.offset().left;
    bboxChild.top = topLeft.top - $parent.offset().top;
    bboxChild.right = bboxChild.left + $child.outerWidth();
    bboxChild.bottom = bboxChild.top + $child.outerHeight();

    delta = bboxChild.bottom - bboxParent.bottom;
    if (delta > 0) {

        // clamp to trackContainer bottom
        topLeft.top -= delta;

        bboxChild.top -= delta;
        bboxChild.bottom -= delta;

        delta = bboxChild.top - bboxParent.top;
        if (delta < 0) {
            topLeft.top -= delta;
        }

    }

    return topLeft;

};

export function log(message) {
    if (igv.enableLogging && console && console.log) {
        console.log(message);
    }
};

export function buildOptions(config, options) {
    var defaultOptions = {
        oauthToken: config.oauthToken || undefined,
        headers: config.headers,
        withCredentials: config.withCredentials,
        oauth: config.oauth
    };

    return _.extend(defaultOptions, options);
}