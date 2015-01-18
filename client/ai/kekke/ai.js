define(['lodash'], function(_) {
    var botNames = [
        'Zero',
        'One',
        'Two'
    ];

    // There can't be two teams with the same name, so add random number
    // as a suffix.
    var teamName = 'Dummy ' + (Math.floor(Math.random() * 100) + 1);

    return function Ai() {
        /**
        * @param roundId
        *          The number of current round. Round 0 is the start round.
        *
        * @param events
        *          List of all events. Look documentation for more information.
        *
        * @param bots
        *          List of all alive bots. Each bot has these attributes
        *
        *          Members:
        *
        *              id: '3',            // Bot's identifier,
        *              name: 'Terminator', // Name of the bot
        *              team: 'Havoc2',     // Name of the team
        *              x: 3,               // The x position on grid. Movement events are automatically applied.
        *              y: 2,               // The y poition on grid. Movement events are automatically applied.
        *              hp: 7,              // Remaining hp. Damage is automatically applied.
        *              last: {             // Last action attempted. In other words the last action that was sent to
        *                  type: 'move',   // Server. Possible types: move, radar and cannon
        *                  x:3,
        *                  y:2 },
        *
        *              dead: false,        // Is bot dead or not
        *
        *          Methods:
        *
        *              move: move,         // Send move action to server.
        *                                  // bot.move(x, y>)
        *              radar: radar,       // Send radar action to server.
        *                                  // bot.radar(x, y)
        *              cannon: cannon,     // Send cannon action to server.
        *                                  // bot.cannon(x, y)
        *              message: message    // Send text string to other bots.
        *                                  // bot.message(text)
        *
        * @param config
        *          Configuration used by the match. Only values which can change during the challenge are:
        *              maxCount: 500,     // Maximum number of rounds
        *              loopTime: 100       // Time between game loops. If no action for a bit is send during this time,
        *                                  // it will not perform any action.
        * @param opponents
        *          Array of opponents.
        */
        function makeDecisions(roundId, events, bots, config, opponents) {
            bots.forEach(function(bot) {
                var xMove = randInt(-2, 2);
                var yMove = randInt(-2, 2);
                bot.move(bot.x + xMove, bot.y + yMove);
            });
            console.log(events);
        }

        function randInt(min, max) {
            var range = max - min;
            var rand = Math.floor(Math.random() * (range + 1));
            return min + rand;
        }


        return {
            // The AI must return these three attributes
            botNames: botNames,
            teamName: teamName,
            makeDecisions: makeDecisions
        };
    };
});
