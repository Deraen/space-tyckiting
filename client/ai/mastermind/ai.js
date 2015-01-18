define(["lodash"], function(_) {
    var botNames = [
        'Drone Zero',
        'Drone One',
        'Drone Two'
    ];

    var teamName = "Mastermind " + (Math.floor(Math.random() * 100) + 1);

    return function Ai() {

        function _prepareAction(action, x, y) {
            return function() {
                action(x,y);
            };
        }

        function planForAttack(plannedActions, players, x, y) {
            return _.reduce(plannedActions, function(result, value, key) {
                if (value.mode === "EVADE") {
                    result[key] = value;
                } else {
                    result[key] = {
                        mode: "ATTACK",
                        action: _prepareAction(players[key].cannon, x, y)
                    };
                }
                return result;
            }, {});
        }

        var lastTarget = {};
        /**
         * The mastermind bot controls all the bots at one team.
         * The logic is following:
         *  - If a bot has been hit, move it to avoid more hits
         *  - If a bot managed to hit something. Everyone tries to hit the last target
         *  - If a bot sees someone, everyone shoot the first sighting
         *  - If a bot is moved, move it's position (NOTE: In case of evading, it probably should take it's changed location into account ;) )
         *  - If no special action, do radaring
         *
         * @param events
         */
        function makeDecisions(roundId, events, bots, config, opponents) {

            // Map bot to id, for easier usage
            var players = _.reduce(bots, function(memo, bot) {
                memo[bot.id] = bot;
                return memo;
            }, {});

            var plannedActions = _.reduce(players, function(memo, player) {
                if (!player.dead) {
                    var x = Math.floor(Math.random() * config.width);
                    var y = Math.floor(Math.random() * config.height);
                    memo[player.id] =  {
                        mode: "RADAR",
                        action: _prepareAction(player.radar, x, y)
                    };
                }
                return memo;
            }, {});

            events.forEach(function(event) {
                if (event.event === "hit") {
                    if (event.data.team === teamName) {
                        var maxMove = config.move;
                        var player = players[event.data.id];
                        var x = player.x + maxMove - maxMove * (Math.floor(Math.random()*maxMove));
                        var y = player.y + maxMove - maxMove * (Math.floor(Math.random()*maxMove));

                        plannedActions[event.data.id] = {
                            mode: "EVADE",
                            action: _prepareAction(player.move, x, y)
                        };
                    } else {
                        plannedActions = planForAttack(plannedActions, players, lastTarget.x, lastTarget.y);
                    }
                } else if (event.event === "see" && event.data.positions.length > 0) {
                    var target = event.data.positions[0];
                    plannedActions = planForAttack(plannedActions, players, target.x, target.y);
                    lastTarget = {x: target.x, y: target.y};
                } else if (event.event === "detected") {
                    players[event.data.id].message("Should I do something now?");
                }
            });

            _.each(plannedActions, function(plan) {
                plan.action.apply();
            });
        }

        return {
            botNames: botNames,
            teamName: teamName,
            makeDecisions: makeDecisions
        };
    };
});
