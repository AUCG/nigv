

// Collection of helper functions for canvas rendering.  The "ctx" paramter in these functions is a canvas 2d context.
//
// Example usage
//
//    igv.graphics.strokeLine(context, 0, 0, 10, 10);
//

const debug = false;

export default class graphics {
        setProperties(ctx, properties) {
            for (var key in properties) {
                if (properties.hasOwnProperty(key)) {
                    var value = properties[key];
                    ctx[key] = value;
                }
            }
        }

        strokeLine(ctx, x1, y1, x2, y2, properties) {
            x1 = Math.floor(x1) + 0.5;
            y1 = Math.floor(y1) + 0.5;
            x2 = Math.floor(x2) + 0.5;
            y2 = Math.floor(y2) + 0.5;
            log("stroke line, prop: " + properties);

            ctx.save();
            if (properties) igv.graphics.setProperties(ctx, properties);

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            ctx.restore();
        }

        fillRect(ctx, x, y, w, h, properties) {
            var c;
            x = Math.round(x);
            y = Math.round(y);

            if (properties) {
                ctx.save();
                igv.graphics.setProperties(ctx, properties);
            }

            ctx.fillRect(x, y, w, h);

            if (properties) ctx.restore();
        }

        fillPolygon(ctx, x, y, properties) {
            ctx.save();
            if (properties)   igv.graphics.setProperties(ctx, properties);
            _doPath(ctx, x, y);
            ctx.fill();
            ctx.restore();
        }

        strokePolygon(ctx, x, y, properties) {
            ctx.save();
            if (properties)   igv.graphics.setProperties(ctx, properties);
            _doPath(ctx, x, y);
            ctx.stroke();
            ctx.restore();
        }

        fillText(ctx, text, x, y, properties, transforms) {
            if (properties) {
                ctx.save();
                igv.graphics.setProperties(ctx, properties);
            }

            ctx.save();

            ctx.translate(x, y);
            if (transforms) {
                for (var transform in transforms) {
                    var value = transforms[transform];

                    // TODO: Add error checking for robustness
                    if (transform == 'translate') {
                        ctx.translate(value['x'], value['y']);
                    }
                    if (transform == 'rotate') {
                        ctx.rotate(value['angle'] * Math.PI / 180);
                    }
                }

            }

            ctx.fillText(text, 0, 0);
            ctx.restore();

            if (properties) ctx.restore();
        }

        strokeText(ctx, text, x, y, properties, transforms) {
            ctx.save();
            if (properties) {
                igv.graphics.setProperties(ctx, properties);
            }
            ctx.translate(x, y);
            if (transforms) {
                for (var transform in transforms) {
                    var value = transforms[transform];

                    // TODO: Add error checking for robustness
                    if (transform == 'translate') {
                        ctx.translate(value['x'], value['y']);
                    }
                    if (transform == 'rotate') {
                        ctx.rotate(value['angle'] * Math.PI / 180);
                    }
                }
            }

            ctx.strokeText(text, 0, 0);
            ctx.restore();
        }

        strokeCircle(ctx, x, y, radius) {
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI);
            ctx.stroke();
        }

        fillCircle(ctx, x, y, radius) {
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI);
            ctx.fill();
        }

        drawArrowhead(ctx, x, y, size, lineWidth) {
            ctx.save();
            if (!size) {
                size = 5;
            }
            if (lineWidth) {
                ctx.lineWidth = lineWidth;
            }
            ctx.beginPath();
            ctx.moveTo(x, y - size / 2);
            ctx.lineTo(x, y + size / 2);
            ctx.lineTo(x + size, y);
            ctx.lineTo(x, y - size / 2);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        dashedLine(ctx, x1, y1, x2, y2, dashLen, properties) {
            ctx.save();
            x1 = Math.round(x1);
            y1 = Math.round(y1);
            x2 = Math.round(x2);
            y2 = Math.round(y2);
            dashLen = Math.round(dashLen);
            log("dashedLine");
            if (properties) igv.graphics.setProperties(ctx, properties);

            if (dashLen == undefined) dashLen = 2;
            ctx.moveTo(x1, y1);

            var dX = x2 - x1;
            var dY = y2 - y1;
            var dashes = Math.floor(Math.sqrt(dX * dX + dY * dY) / dashLen);
            var dashX = dX / dashes;
            var dashY = dY / dashes;

            var q = 0;
            while (q++ < dashes) {
                x1 += dashX;
                y1 += dashY;
                ctx[q % 2 == 0 ? 'moveTo' : 'lineTo'](x1, y1);
            }
            ctx[q % 2 == 0 ? 'moveTo' : 'lineTo'](x2, y2);

            ctx.restore();
        }
};

function _doPath(ctx, x, y) {
    var i, len = x.length;
    for (i = 0; i < len; i++) {
        x[i] = Math.round(x[i]);
        y[i] = Math.round(y[i]);
    }

    ctx.beginPath();
    ctx.moveTo(x[0], y[0]);
    for (i = 1; i < len; i++) {
        ctx.lineTo(x[i], y[i]);
    }
    ctx.closePath();
}

function _log(msg) {
    if (debug) {
        var d = new Date();
        var time = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
        if (typeof copy != "undefined") {
            copy(msg);
        }
        if (typeof console != "undefined") {
            console.log("igv-canvas: " + time + " " + msg);
        }
    }
}