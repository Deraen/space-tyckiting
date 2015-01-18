var _ = require('lodash');

function getNoActions(players) {
    return _.where(players, {action: null});
}

function getMoveEvents(players, moveLength, maxWidth, maxHeight) {
    return _.flatten(_filterPlayersByEventType(players, "move").map(_.partial(_handleMove, moveLength, maxWidth, maxHeight)));
}

function getRadarEvents(players, radarRadius) {
    return _.flatten(_filterPlayersByEventType(players, "radar").map(_.partial(_handleRadar, players, radarRadius)));
}

function getCannonEvents(players, cannonRadius) {
    return _.flatten(_filterPlayersByEventType(players, "cannon").map(_.partial(_handleBlast, players, cannonRadius)));
}

function _filterPlayersByEventType(players, type) {
    return _.filter(players, function(player) {
        return player.action && player.action.type === type;
    });
}

function _inDistance(sourcePos, targetPos, distance) {
   return (Math.abs(sourcePos.x - targetPos.x) <= distance) && (Math.abs(sourcePos.y - targetPos.y) <= distance);
}

function getSeeingEvents(players, seeDistance) {
    // This could of course be optimized... but as we are handling such small amount of bots and each should have different
    // kind of message, I'll let this stick.
    return _.reduce(players, function(total, source) {
        return total.concat(_.reduce(players, function(result, target) {
            if (_inDistance(source.pos, target.pos, seeDistance)) {
                if (source.team !== target.team) {
                    result.push(
                        {
                            source: source.id,
                            target: target
                        });
                }
            }
            return result;
        }, []));
    }, []);


}


function applyMoveEvents(moves, players) {
    moves.forEach(function(move) {
        _.where(players, {id: move.id}).map(function(player) {
            player.pos = {x: move.x, y: move.y};
        });
    });
    return players;
}

function applyDamages(cannons, players) {
    cannons.forEach(function(cannon) {
        _.where(players, {id: cannon.target.id}).map(function(player) {
            player.hp -= cannon.damage;
        });
    });
    return players;
}


function _isDirect(pos, target) {
    return pos.x === target.x && pos.y === target.y;
}

function _isInside(source, radius, target) {
    var d = {
        x1: source.x - radius,
        x2: source.x + radius,
        y1: source.y - radius,
        y2: source.y + radius
    };
    return (d.x1 <= target.pos.x && target.pos.x <= d.x2) && (d.y1 <= target.pos.y && target.pos.y <= d.y2);
}

function _handleBlast(tanks, radius, player) {
    return _.filter(tanks, _.partial(_isInside, player.action, radius)).map(function(tank) {
        return {
            source: player.id,
            target: tank,
            damage: _isDirect(tank.pos, player.action) ? 2 : 1
        };
    });
}

function _handleRadar(tanks, radius, player) {
    return _.filter(tanks, _.partial(_isInside, player.action, radius)).reduce(function(memo, tank) {
        // Should this also include self?
        if (tank.team !== player.team) {
            memo.push({
                source: player.id,
                target: tank
            });
        }
        return memo;
    }, []);
}

// TODO Prevent moving out of bounds?
function _handleMove(moveLength, maxWidth, maxHeight, player) {
    if (_isInside(player.action, moveLength, player)) {
        var x = player.action.x;
        var y = player.action.y;

        if (x < 0) {
            x = 0;
        }
        if (x >= maxWidth) {
            x = maxWidth - 1;
        }
        if (y < 0) {
            y = 0;
        }
        if (y >= maxHeight) {
            y = maxHeight - 1;
        }
        return {
            id: player.id,
            x: x,
            y: y
        };
    } else {
        return {
            id: player.id,
            x: player.pos.x,
            y: player.pos.y
        };
    }
}

function checkForStart(players, playersPerTeam) {
    console.log("Starting", players.length, _.where(players, {active: true}).length, playersPerTeam * 2);
    return _.where(players, {active: true}).length >= playersPerTeam * 2;
}

function isFinished(players, counter, maxCount) {
    if (counter >= maxCount) {
        return true;
    }
    if (_.isEmpty(players)) {
        return true;
    }

    var activePlayers = _.filter(players, function(player) {
        return player.hp > 0 && player.active;
    });

    // Only one team or no teams left
    return _.uniq(_.pluck(activePlayers, "team")).length <= 1;
}

module.exports = {
    applyMoveEvents: applyMoveEvents,
    applyDamages: applyDamages,
    getNoActions: getNoActions,
    getMoveEvents: getMoveEvents,
    getRadarEvents: getRadarEvents,
    getCannonEvents: getCannonEvents,
    getSeeingEvents: getSeeingEvents,
    checkForStart: checkForStart,
    isFinished: isFinished
}
