// ==LampaPlugin==
// Name: Subtitles Sync AI
// Description: Plugin for auto-generating subtitles using Web Speech API
// Version: 1.1.19
// Author: grafbraga
// ==/LampaPlugin==

(function () {
    'use strict';

    if (!window.Lampa) {
        console.log('[SubtitlesSyncAI] Lampa environment not found');
        return;
    }

    var SubtitlesSyncAI = {
        name: 'SubtitlesSyncAI',
        version: '1.1.19',
        recognition: null,
        subtitles: [],
        languages: ['en-US', 'ru-RU', 'es-ES', 'fr-FR', 'de-DE'],
        selectedLang: 'en-US',

        init: function () {
            var _this = this;

            console.log('[SubtitlesSyncAI] Initializing plugin');

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
                    console.log('[SubtitlesSyncAI] Recognized text:', transcript);
                    _this.addSubtitle(transcript);
                };

                this.recognition.onerror = function (event) {
                    console.error('[SubtitlesSyncAI] Recognition error:', event.error);
                    Lampa.Noty.show('Ошибка распознавания: ' + event.error);
                };
            } else {
                console.log('[SubtitlesSyncAI] Web Speech API not supported');
                Lampa.Noty.show('Web Speech API не поддерживается в этом браузере');
                return;
            }

            // Отложенная инициализация
            console.log('[SubtitlesSyncAI] Setting up listeners');
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') {
                    setTimeout(function () {
                        console.log('[SubtitlesSyncAI] App ready, configuring plugin');
                        if (Lampa.Noty) Lampa.Noty.show('Subtitles Sync AI v1.1.19 loaded');
                        _this.addSettings();
                        _this.setupPlayer();
                    }, 500);
                }
            });
        },

        addSettings: function () {
            var _this = this;

            console.log('[SubtitlesSyncAI] Adding settings to root menu');
            Lampa.Settings.add('subtitles_sync_ai', {
                name: 'Subtitles Sync AI',
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
                            console.log('[SubtitlesSyncAI] Language set to:', value);
                        }
                    }
                ]
            });

            this.selectedLang = Lampa.Storage.get('subtitles_sync_ai_lang', this.selectedLang);
        },

        setupPlayer: function () {
            var _this = this;

            console.log('[SubtitlesSyncAI] Setting up player');
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
                        console.log('[SubtitlesSyncAI] Opened settings from player menu');
                    }
                });

                console.log('[SubtitlesSyncAI] Player menu items added');
            } else {
                console.log('[SubtitlesSyncAI] Error: Lampa.PlayerMenu unavailable');
                Lampa.Noty.show('Error: PlayerMenu unavailable');
            }

            Lampa.Listener.follow('player', function (e) {
                if (e.type == 'start') {
                    _this.subtitles = [];
                    console.log('[SubtitlesSyncAI] Playback started');
                }
            });
        },

        startRecognition: function () {
            if (!this.recognition) {
                console.log('[SubtitlesSyncAI] Speech recognition unavailable');
                Lampa.Noty.show('Speech recognition unavailable');
                return;
            }

            this.subtitles = [];
            try {
                this.recognition.start();
                console.log('[SubtitlesSyncAI] Started subtitle generation');
                Lampa.Noty.show('Начата генерация субтитров...');
            } catch (e) {
                console.error('[SubtitlesSyncAI] Error starting recognition:', e);
                Lampa.Noty.show('Start error: ' + e.message);
            }
        },

        addSubtitle: function (text) {
            var player = Lampa.Player;
            var currentTime = player.time();

            this.subtitles.push({
                start: currentTime,
                end: currentTime + 2, // Длительность субтитра 2 секунды
                text: text
            });

            console.log('[SubtitlesSyncAI] Adding subtitle:', this.subtitles[this.subtitles.length - 1]);
            player.subtitles.add({
                label: 'AI Subtitles (' + this.selectedLang.split('-')[0].toUpperCase() + ')',
                content: this.subtitles
            });
            console.log('[SubtitlesSyncAI] Subtitles added to player');
        }
    };

    SubtitlesSyncAI.init();

    if (window.Lampa && window.Lampa.Plugins) {
        window.Lampa.Plugins[SubtitlesSyncAI.name] = SubtitlesSyncAI;
        console.log('[SubtitlesSyncAI] Plugin registered successfully');
    } else {
        console.log('[SubtitlesSyncAI] Error: Lampa.Plugins unavailable');
    }
})();
