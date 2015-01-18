define([
    'jquery',
    'lodash',
    'grid'],
    function(
        $,
        _,
        Grid)
    {
    var colors = [
        'bot1',
        'bot2',
        'bot3',
        'bot4'
    ];

    return function() {

        var statusTemplate =
            '<li class="status" data-id="<%= id %>">' +
            '   <span class="idbox <%= color %>"></span>' +
            '   <span class="name"><%= name %></span>' +
            '   <span class="hp"><%= hp %></span> /' +
            '   <span class="max"><%= max %></span>' +
            '</li>';

        var $statusArea = $('#team .statuses');

        function addBot(colorIndex, bot, config) {
            if ($statusArea.find('[data-id="' + bot.id + '"]').length === 0) {
                $statusArea.append(
                    _.template(statusTemplate, {
                        color: colors[colorIndex % colors.length],
                        id: bot.id,
                        name: bot.name,
                        hp: bot.hp,
                        max: config.startHp
                    })
                );
            }
        }

        function updateBot(bot) {
            var $status = $statusArea.find('.status[data-id="' + bot.id + '"]');
            if ($status.length > 0) {
                $status.find(".hp").html(bot.hp);
            }
        }

        function reset() {
            $statusArea.html('');
        }

        function getBotClass(index) {
            return colors[index % colors.length];
        }

        return {
            addBot: addBot,
            updateBot: updateBot,
            reset: reset,
            getBotClass: getBotClass
        };
    };
});
