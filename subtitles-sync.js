// ==LampaPlugin==
// Name: Subtitles Sync AI
// Description: Plugin for auto-generating subtitles using Web Speech API
// Version: 1.1.20
// Author: grafbraga
// ==/LampaPlugin==

(function () {
    'use strict';

    if (!window.Lampa) return;

    var SubtitlesSyncAI = {
        name: 'SubtitlesSyncAI',
        version: '1.1.20',
        recognition: null,
        subtitles: [],
        languages: ['en-US', 'ru-RU', 'es-ES', 'fr-FR', 'de-DE'],
        selectedLang: 'en-US',

        init: function () {
            var _this = this;

            // Инициализация Web Speech API
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                this.recognition = new SpeechRecognition();
                this.recognition.continuous = true;
                this.recognition.interimResults = true;
                this.recognition.lang = this.selectedLang;

                this.recognition.onresult = function (event) {
                    var transcript = '';
                    for (var i = event.resultIndex; i < event.results.length; i++) {
                        transcript += event.results[i][0].transcript;
                    }
                    _this.addSubtitle(transcript);
                };

                this.recognition.onerror = function (event) {
                    Lampa.Noty.show('Ошибка распознавания: ' + event.error);
                };
            } else {
                Lampa.Noty.show('Web Speech API не поддерживается в этом браузере');
                return;
            }

            // Отложенная инициализация (как в 1.1.2)
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') {
                    setTimeout(function () {
                        _this.addSettings();
                        _this.setupPlayer();
                    }, 500);
                }
            });
        },

        addSettings: function () {
            var _this = this;

            Lampa.Settings.add('subtitles_sync_ai', {
                name: 'Subtitles Sync AI',
                index: -1, // Как в tricks.js, для верхнего положения в меню
                items: [
                    {
                        name: 'subtitles_sync_ai_lang',
                        type: 'select',
                        values: this.languages.reduce(function (result, lang) {
                            result[lang] = lang.split('-')[0].toUpperCase();
                            return result;
                        }, {}),
                        default: this.selectedLang,
                        title: 'Язык субтитров AI',
                        onChange: function (value) {
                            _this.selectedLang = value;
                            Lampa.Storage.set('subtitles_sync_ai_lang', value);
                            if (_this.recognition) _this.recognition.lang = value;
                        }
                    }
                ]
            });

            this.selectedLang = Lampa.Storage.get('subtitles_sync_ai_lang', this.selectedLang);
        },

        setupPlayer: function () {
            var _this = this;

            if (Lampa.PlayerMenu) {
                Lampa.PlayerMenu.add({
                    title: 'AI Subtitles',
                    subtitle: 'Генерация субтитров через AI',
                    icon: 'subtitles',
                    action: function () {
                        _this.startRecognition();
                    }
                });

                Lampa.PlayerMenu.add({
                    title: 'AI Subtitles Settings',
                    subtitle: 'Настройка субтитров',
                    icon: 'settings',
                    action: function () {
                        Lampa.Settings.show({
                            category: 'subtitles_sync_ai',
                            title: 'Subtitles Sync AI'
                        });
                    }
                });
            }

            Lampa.Listener.follow('player', function (e) {
                if (e.type == 'start') {
                    _this.subtitles = [];
                }
            });
        },

        startRecognition: function () {
            if (!this.recognition) {
                Lampa.Noty.show('Распознавание речи недоступно');
                return;
            }

            this.subtitles = [];
            this.recognition.start();
            Lampa.Noty.show('Начата генерация субтитров...');
        },

        addSubtitle: function (text) {
            var player = Lampa.Player;
            var currentTime = player.time();

            this.subtitles.push({
                start: currentTime,
                end: currentTime + 2, // Длительность субтитра 2 секунды
                text: text
            });

            player.subtitles.add({
                label: 'AI Subtitles (' + this.selectedLang.split('-')[0].toUpperCase() + ')',
                content: this.subtitles
            });
        }
    };

    SubtitlesSyncAI.init();

    if (window.Lampa && window.Lampa.Plugins) {
        window.Lampa.Plugins[SubtitlesSyncAI.name] = SubtitlesSyncAI;
    }
})();
