var _ = require('lodash');

var messageCount = 0;

function getRoundStartMessage(counter) {
    return {
        event: "round",
        data: {
            roundId: counter
        }
    };
}

function getNoActionMessagesByTeam(noActionBots, team) {
    return noActionBots.reduce(function(memo, bot) {
        if (bot.team === team) {
            return memo.concat({
                event: "noaction",
                data: _playerInfo(bot)
            });
        }
        return memo;
    }, []);
}

function getMessages(players) {
    return players.reduce(function(memo, player) {
        if (player.message) {
            memo.push({
                event: "message",
                data: {
                    messageId: messageCount++,
                    source: _playerInfo(player),
                    message: player.message
                }
            });
        }
        return memo;
    }, []);
}

function getMoveMessagesByPlayer(moves, player) {
    return _.where(moves, {"id": player.id}).map(function(move) {
        return {
            event: "move",
            data: move
        };
    });
}

function getDetectedMessagesByPlayer(radars, player) {
    if (_.where(radars, {"target": player}).length > 0) {
        return {
            event: "detected",
            data: {
                id: player.id
            }
        };
    } else {
        return [];
    }
}

function getRadarMessagesByPlayer(radars, player) {
    var detections = _.pluck(_.where(radars, {"source": player.id}), "target").map(_playerInfoWithPosition);

    return {
        event: "see",
        data: {
            source: player.id,
            "positions" : detections
        }
    };
}

function getCannonMessagesByPlayer(cannons, player) {
    var damages = _.pluck(_.where(cannons, {"source": player.id}), "target").map(function(target) {
        var message = _playerInfo(target);
        message.source = _playerInfo(player);

        return {
            event: "hit",
            data: message
        };
    });
    damages = damages.concat(_.where(cannons, {"target": player}).map(function(event) {
        var playerInfo = _playerInfo(player);
        playerInfo.damage = event.damage;
        return {
            event: "hit",
            data: playerInfo
        };
    }));
    return damages;
}

function endMessage(players, teams) {

    // TODO More detailed victory message
    var winners = _.filter(players, function(player) {
        return player.active && player.hp > 0;
    });

    var message = {
        type: "end",
        data: {
        }
    };

    if (winners.length === 0) {
        message.data.winner = {
            team: undefined
        };
    } else {
        message.data.winner = {
            team: winners[0].team
        };
    }
    return message;
}

function startMessage(player, players, config) {
    var message = {
        you: _playerInfoWithPosition(player),
        config: config
    };
    message.team = _.reduce(players, function(memo, other) {
        if (other.id !== player.id && other.team === player.team) {
            memo.push(_playerInfoWithPosition(other));
        }
        return memo;
    }, []);
    message.opponents = _.reduce(players, function(memo, other) {
        if (other.id !== player.id && other.team !== player.team && other.active) {
            memo.push(_playerInfo(other));
        }
        return memo;
    }, []);
    return message;
}

function destroyedEventMessage(player) {
    return {
        event: "die",
        data: _playerInfoWithPosition(player)
    }
}

function _playerInfoWithPosition(player) {
    return _playerInfo(player, true);
}

function _playerInfoWithPositionAndHp(player) {
    return _playerInfo(player, true, true);
}


function _playerInfo(player, includePosition, includeHp) {

    var info = {
        "id": player.id,
        "name": player.name,
        "team": player.team
    };

    if (includePosition) {
        info.x  = player.pos.x;
        info.y = player.pos.y;
    }

    if (includeHp) {
        info.hp = player.hp;
    }
    return info;
}

function getTeamStatusMessage(players, team) {
    var bots = _.where(players, {team: team, active: true}).map(_playerInfoWithPositionAndHp);
    return {
        event: "team",
        data: bots
    };
}

function getMessagesByTeam(func) {
    return function(events, players, team) {
        return _.reduce(players, function(memo, player) {
            if (player.team === team) {
                return memo.concat(func(events, player));
            } else {
                return memo;
            }
        }, []);
    };
}

module.exports = {
    getRoundStartMessage: getRoundStartMessage,
    getMessages: getMessages,
    getMoveMessagesByPlayer: getMoveMessagesByPlayer,
    getRadarMessagesByPlayer: getRadarMessagesByPlayer,
    getCannonMessagesByPlayer: getCannonMessagesByPlayer,
    getNoActionMessagesByTeam: getNoActionMessagesByTeam,
    getMoveMessagesByTeam: getMessagesByTeam(getMoveMessagesByPlayer),
    getRadarMessagesByTeam: getMessagesByTeam(getRadarMessagesByPlayer),
    getDetectedMessagesByTeam: getMessagesByTeam(getDetectedMessagesByPlayer),
    getCannonMessagesByTeam: getMessagesByTeam(getCannonMessagesByPlayer),
    destroyedEventMessage: destroyedEventMessage,
    getTeamStatusMessage: getTeamStatusMessage,
    startMessage: startMessage,
    endMessage: endMessage
};
