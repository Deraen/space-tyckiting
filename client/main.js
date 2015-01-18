define([
    'jquery',
    'lodash',
    'socket-io',
    'promise',
    'messageBox',
    'grid',
    'ui',
    './bots/_current/ai'],
    function($,
             _,
             io,
             Promise,
             MessageBox,
             Grid,
             Ui,
             Ai) {

    var BOT_COUNT = 3;
    var TARGET_URL = 'http://localhost:3000';

    var ai = new Ai();

    function createBots(ai, botCount) {

        // Shared state
        var activeRound = null;

        var $mapArea = $('#mapArea');
        var $map = $('<div class="map innerBorder"></div>');
        $mapArea.append($map);
        var messageBox = new MessageBox();
        var ui = new Ui();

        var grid = null;

        var bots = [];
        var opponents = [];

        var botIdMap = {};

        function createBot(ai, botIndex) {

            var socket = io.connect(TARGET_URL, {'multiplex' : false});

            socket.on("connected", function(joinMessage) {

                var config = joinMessage.config;

                var botId = joinMessage.id;
                var botName = ai.botNames[botIndex];
                var botTeam = ai.teamName;

                grid = grid || new Grid($map, botTeam, config.width, config.height, config.cannon, config.radar);

                socket.emit("join", {
                    name: botName,
                    team: botTeam
                });

                socket.on("start", function (data) {

                    // It set three times, but it really doesn't matter
                    opponents = data.opponents;

                    function action(type, x, y) {
                        var data = {
                            type: type,
                            x: x,
                            y: y
                        };
                        botIdMap[botId].lastAction = data;
                        socket.emit("action", data);
                    }

                    function move(x, y) {
                        return action("move", x, y);
                    }

                    function radar(x, y) {
                        grid.drawRadar(x,y);
                        return action("radar", x, y);
                    }

                    function cannon(x, y) {
                        grid.drawBlast(x,y);
                        return action("cannon", x, y);
                    }

                    function message(message) {
                        socket.emit("message", message);
                    }

                    bots[botIndex] = {
                        id: botId,
                        name: botName,
                        x: data.you.x,
                        y: data.you.y,
                        hp: config.startHp,
                        last: {},
                        dead: false,
                        move: move,
                        radar: radar,
                        cannon: cannon,
                        message: message
                    };

                    botIdMap[botId] = bots[botIndex];

                    socket.removeAllListeners("events");

                    clearNotifications();
                    clearMessages();
                    grid.clear();
                    ui.reset();
                    bots[botIndex].bot_class = ui.getBotClass(botIndex);
                    grid.updatePosition(botId, data.you.x, data.you.y, bots[botIndex].bot_class, false);

                    socket.on('events', function(events) {
                        // First event is always the currentRound event
                        var currentRound = events[0].data.roundId;

                        if (currentRound === 0) {
                            ui.addBot(botIndex, {id: botId, name: botName, hp: config.startHp, max: config.startHp}, config);
                        }
                        // The previous bot was dead. This should take effect only after
                        // the currentRound is handled with all players
                        if (activeRound !== currentRound) {
                            activeRound = currentRound;

                            grid.clear();

                            _.where(events, { event:'team' }).forEach(function(team) {
                                team.data.forEach(function(bot) {
                                    botIdMap[bot.id].hp = bot.hp;
                                    if (botIdMap[bot.id].hp <= 0) {
                                        botIdMap[bot.id].dead = true;
                                    }
                                    botIdMap[bot.id].x = bot.x;
                                    botIdMap[bot.id].y = bot.y;
                                    grid.updatePosition(bot.id, bot.x, bot.y, botIdMap[bot.id].bot_class, botIdMap[bot.id].dead);
                                    ui.updateBot(bot);
                                });
                            });

                            _.where(events, {event:'die'}).forEach(function(death) {
                                grid.drawDestroyed(death.data.x, death.data.y);
                                if (death.data.team !== botTeam) {
                                    var opponent = _.findWhere(opponents, {id: death.data.id});
                                    if (!_.isUndefined(opponent)) {
                                        opponent.dead = true;
                                    }
                                }
                            });

                            ai.makeDecisions(currentRound, events, bots, config, opponents);

                            // Only one set of events should be passed to the MasterMind

                            // We draw the situation after movements so that we wouldn't cause too much extra delay with an answer
                            events.forEach(function(event) {
                                if (event.event === "hit") {
                                    if (event.data.team === botTeam) {
                                        grid.gotHit(event.data.id);
                                    }
                                } else if (event.event === "see") {
                                    event.data.positions.forEach(function(position) {
                                        grid.detect(position.x, position.y);
                                    });
                                } else if (event.event === "message") {
                                    var friendlyMessage = event.data.source.team === botTeam;
                                    showMessage(event.data.source, event.data.messageId, event.data.message, friendlyMessage);
                                }
                            });
                        }
                    });

                    socket.on("end", function(data) {
                        socket.removeAllListeners("events");

                        if (data.data.winner && data.data.winner.team === botTeam) {
                            showNotification("YOU<br>WIN");
                        } else {
                            showNotification("YOU<br>LOSE");
                        }
                    });
                });
            });

            function clearNotifications() {
                $map.find('.notification').remove();
            }

            function showNotification(message) {
                $map.find('.notification').remove();
                $map.append('<div class="notification">' + message + '</div>');
            }
        }


        for (var i = 0; i < botCount; ++i) {
            createBot(ai, i);
        }

        function clearMessages() {
            messageBox.clear();
        }

        function showMessage(source, id, message, friend) {
            messageBox.addMessage(source, id, message, friend ? 'friend' : 'foe');
        }
    }

    createBots(ai, BOT_COUNT);
});
