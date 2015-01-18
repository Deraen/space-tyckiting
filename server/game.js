var Rules = require('./rules.js');
var Messages = require('./messages.js');
var ActionLog = require('./actionlog.js');
var _ = require('lodash');

function Game(config) {

    var players = [];
    var started = false;
    var finished = false;

    var idCounter = 0;

    function rand(val) {
        return Math.floor(Math.random() * val);
    }

    function startListening(io) {

        io.on('connection', function(socket){

            var id = idCounter++;
            var player = {id: id, socket: socket};

            players.push(player);

            socket.on("action", function(data) {
                console.log("%s: ", player.name, data);
                if (!finished) {
                    player.action = data;
                }
            });

            socket.on("message", function(message) {
                player.message = message;
            });

            socket.on('disconnect', function () {
                console.log("Disconnect", id);
                player.active = false;
            });

            socket.on("join", function(data) {
                if (started) {
                    if (socket) {
                        socket.emit("err", "Already started");
                    }
                    return;
                }
                // Clear inactive players (players without connection)
                players = _.filter(players, function(player) {
                    return player.socket;
                });

                console.log("Received join", player.id, data);
                player.name = data.name;
                player.team = data.team;
                player.active = true;

                if (Rules.checkForStart(players, config.teamPlayers)) {
                    start(players, config);
                }
            });
            socket.emit("connected", {id: id, config: config});
        });

        var sendToTeam = function(team, players, eventType, data) {
            var members = _.where(players, {team: team});
            members.forEach(function(member) {
                member.socket.emit(eventType, data);
            });
        };

        var start = function(players, config) {
            var teams = _.uniq(_.pluck(players,'team'));
            finished = false;
            // Initialize positions and data
            players.forEach(function(player) {
                player.hp = config.startHp;
                player.pos = {x: rand(config.width), y: rand(config.height)};
            });
            players.forEach(function(player) {
                if (player.socket) {
                    player.socket.emit("start", Messages.startMessage(player, players, config));
                }
            });
            started = true;
            setTimeout(function () {
                gameLoop(teams, players, 0, {teams: ActionLog.getStartData(teams, players), turns: []});
            }, 200);
        };

        var gameLoop = function(teams, players, counter, statistics) {

            // Actually just mutates the original array
            var activePlayers = _.filter(players, function(player) {
                return player.hp > 0 && player.active;
            });

            if (counter === 0) {
                // The round 0 is start round. No actions should be performed before it.
                activePlayers.forEach(function(player) {
                    player.action = null;
                });
            }
            statistics.turns.push(ActionLog.getTurnActions(activePlayers));

            // MOVE
            // TODO Handle error cases
            var moves = Rules.getMoveEvents(activePlayers, config.move, config.width, config.height);
            activePlayers = Rules.applyMoveEvents(moves, activePlayers);
            // RADAR includes both detections by radar and seeing range
            var radars = Rules.getRadarEvents(activePlayers, config.radar);
            radars = radars.concat(Rules.getSeeingEvents(activePlayers, config.see));

            // CANNONS
            var cannons = Rules.getCannonEvents(activePlayers, config.cannon);

            // Noactions
            var noActions = Rules.getNoActions(activePlayers);

            // TODO Implement message events
            // var messages = Rules.getMessageEvents(activePlayers);
            activePlayers = Rules.applyDamages(cannons, activePlayers);
            var isFinished = Rules.isFinished(players, counter, config.maxCount);

            if (isFinished) {
                finished = true;
                started = false;
                var message = Messages.endMessage(players, teams);
                console.log("Game Ended", message);
                players.forEach(function(player) {
                    if (player.socket) {
                        player.socket.emit("end", message);
                    }
                });
            } else {

                var broadCasts = [Messages.getRoundStartMessage(counter)];

                broadCasts = broadCasts.concat(Messages.getMessages(activePlayers));

                // Check if any tank was destroyed this turn
                var newlyDestroyed = _.filter(activePlayers, function(player) {
                    return player.hp <= 0;
                });

                if (!_.isEmpty(newlyDestroyed)) {
                    broadCasts = broadCasts.concat(newlyDestroyed.map(Messages.destroyedEventMessage));
                }

                var teamEvents = _.reduce(teams, function(memo, team) {
                    var events = [].concat(broadCasts)
                        .concat(Messages.getMoveMessagesByTeam(moves, players, team))
                        .concat(Messages.getDetectedMessagesByTeam(radars, players, team))
                        .concat(Messages.getRadarMessagesByTeam(radars, players, team))
                        .concat(Messages.getCannonMessagesByTeam(cannons, players, team))
                        .concat(Messages.getNoActionMessagesByTeam(noActions, team))
                        .concat(Messages.getTeamStatusMessage(players, team));
                    memo[team] = events;
                    return memo;
                }, {});


                players.forEach(function(player) {
                    // Clear the previous events
                    player.action = null;
                    player.message = null;
                });

                teams.forEach(function(team) {
                    sendToTeam(team, activePlayers, "events", teamEvents[team]);
                });

                setTimeout(function () {
                    gameLoop(teams, players, counter+1, statistics);
                }, config.loopTime);
            }
        };
    }

    return {
        startListening: startListening
    };
}

module.exports = Game;
