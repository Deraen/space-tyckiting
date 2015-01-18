define(["jquery"], function($) {

    return function($el, name, width, height, blastRadius, detectRadius) {
        blastRadius = blastRadius || 0;
        detectRadius = detectRadius || 0;
        var positions = {};

        function createMap(width, height) {
            var c,r;

            var $table = $('<table></table>');
            $table.append('<tr><th colspan="' + width + '">' + name + '</th></tr>');

            for (r = 0; r < height; ++r) {
                var $row = $('<tr class="r' + r + '"></td>');
                for (c = 0; c < width; ++c) {
                    var $col = $('<td class="c' + c + '"></td>');
                    $row.append($col);
                }
                $table.append($row);
            }
            return $table;
        }

        function updateName(name) {
            $el.find('th').html(name);
        }

        function clear() {
            $el.find('td').removeClass('hit destroyed blast detect radar');

            Object.keys(positions).forEach(function(key) {
                addClass(positions[key].x, positions[key].y, positions.botClass);
            });
        }

        function gotHit(id) {
            if (positions[id]) {
                hit(positions[id].x, positions[id].y);
            }
        }

        function hit(x, y) {
            addClass(x, y, "hit");
        }

        function addClass(x,y, css) {
            $el.find('.r' + y + " .c" + x).addClass(css);
        }

        function removeClass(x,y, css) {
            $el.find('.r' + y + " .c" + x).removeClass(css);
        }

        function detect(x,y) {
            $el.find('.r' + y + " .c" + x).addClass("detect");
        }

        function updatePosition(id, x, y, botClass, dead) {
            if (positions[id]) {
                removeClass(positions[id].x, positions[id].y, positions[id].botClass);
            }
            if (dead) {
                botClass = "destroyed";
            }
            positions[id] = {x: x, y: y, botClass: botClass};

            addClass(x, y, botClass);
        }

        function drawDestroyed(x,y) {
            addClass(x, y, "destroyed");
        }

        function drawBlast(x,y) {
            drawArea(x, y, blastRadius, "blast");
        }

        function drawRadar(x,y) {
            drawArea(x, y, detectRadius, "radar");
        }

        function drawArea(x, y, radius, css) {
            var i,j;

            for (i = x - radius; i <= x + radius; ++i) {
                for (j = y - radius; j <= y + radius; ++j) {
                    addClass(i,j, css);
                }
            }
        }

        $el.html(createMap(width, height));

        return {
            updatePosition: updatePosition,
            updateName: updateName,
            gotHit: gotHit,
            hit: hit,
            drawDestroyed: drawDestroyed,
            drawBlast: drawBlast,
            drawRadar: drawRadar,
            detect: detect,
            clear: clear
        };
    };
});
