// ==LampaPlugin==
// Name: Subtitles Sync Test
// Description: Minimal test plugin
// Version: 1.0.0
// Author: grafbraga
// ==/LampaPlugin==

(function () {
    'use strict';

    if (!window.Lampa) return;

    var SubtitlesSyncTest = {
        name: 'SubtitlesSyncTest',

        init: function () {
            var _this = this;
            Lampa.Listener.follow('app', function (e) {
                if (e.type == 'ready') {
                    setTimeout(function () {
                        if (Lampa.Noty) Lampa.Noty.show('Test plugin loaded');
                        _this.addMenuItem();
                    }, 500);
                }
            });
        },

        addMenuItem: function () {
            if (Lampa.PlayerMenu) {
                Lampa.PlayerMenu.add({
                    title: 'Subtitles Sync Test',
                    subtitle: 'Test plugin',
                    icon: 'subtitles',
                    action: function () {
                        Lampa.Noty.show('Test plugin clicked!');
                    }
                });
            }
        }
    };

    SubtitlesSyncTest.init();

    if (window.Lampa && window.Lampa.Plugins) {
        window.Lampa.Plugins[SubtitlesSyncTest.name] = SubtitlesSyncTest;
    }
})();
