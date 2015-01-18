var _ = require('lodash');

function getStartData(teams, players) {
    return teams.map(function(team, index) {
        return {
            id: index,
            team: team,
            bots: _botsByTeam(team, players)
        };
    });
}

function _botsByTeam(team, players) {
    return _.where(players, {team: team}).map(function(bot) {
        return {
            "id": bot.id,
            "name": bot.name,
            "x": bot.pos.x,
            "y": bot.pos.y
        };
    });
}

function _mapAction(bot, action) {
    return {
        botId: bot.id,
        x: action.x,
        y: action.y
    };
}

function _mapActions(players, action) {
    return _.reduce(players, function(result, player) {
        if (player.action && player.action.type === action) {
            result.push(_mapAction(player, player.action));
        }
        return result;
    }, []);
}


function getTurnActions(players) {
    return {
        radars: _mapActions(players, "radar"),
        moves: _mapActions(players, "move"),
        cannons: _mapActions(players, "cannon")
    };
}

module.exports = {
    getStartData: getStartData,
    getTurnActions: getTurnActions
};
