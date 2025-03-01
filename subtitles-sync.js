// ==LampaPlugin==
// Name: Subtitles Sync AI
// Description: Plugin for auto-generating subtitles using Web Speech API
// Version: 1.1.16
// Author: grafbraga & Grok3-xAI
// ==/LampaPlugin==

(function () {
    'use strict';

    if (!window.Lampa) {
        console.log('Lampa environment not found');
        return;
    }

    var SubtitlesSyncAI = {
        name: 'SubtitlesSyncAI',
        version: '1.1.16',
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
                this.recognition.interimResults = false;
                this.recognition.lang = this.selectedLang;

                this.recognition.onresult = function (event) {
                    for (var i = event.resultIndex; i < event.results.length; i++) {
                        if (event.results[i].isFinal) {
                            var transcript = event.results[i][0].transcript;
                            console.log('Recognized text:', transcript);
                            _this.addSubtitle(transcript);
                        }
                    }
                };

                this.recognition.onerror = function (event) {
                    console.error('Speech recognition error:', event.error);
                    Lampa.Noty.show('Recognition error: ' + event.error);
                };

                this.recognition.onend = function () {
                    console.log('Speech recognition ended');
                    Lampa.Noty.show('Subtitle generation stopped');
                };
            } else {
                console.log('Web Speech API not supported');
                Lampa.Noty.show('Web Speech API not supported');
                return;
            }

            console.log('Initializing Subtitles Sync AI');
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') {
                    setTimeout(function () {
                        console.log('App ready, setting up plugin');
                        if (Lampa.Noty) Lampa.Noty.show('Subtitles Sync AI v1.1.16 loaded');
                        _this.addSettings();
                        _this.setupPlayer();
                    }, 500);
                }
            });
        },

        addSettings: function () {
            var _this = this;

            console.log('Adding settings to root menu');
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
                        title: 'Subtitle Language',
                        onChange: function (value) {
                            _this.selectedLang = value;
                            Lampa.Storage.set('subtitles_sync_ai_lang', value);
                            if (_this.recognition) _this.recognition.lang = value;
                            console.log('Language set to:', value);
                        }
                    }
                ]
            });

            this.selectedLang = Lampa.Storage.get('subtitles_sync_ai_lang', this.selectedLang);
        },

        setupPlayer: function () {
            var _this = this;

            console.log('Setting up player');
            if (Lampa.PlayerMenu) {
                Lampa.PlayerMenu.add({
                    title: 'AI Subtitles',
                    subtitle: 'Generate subtitles',
                    icon: 'subtitles',
                    action: function () {
                        _this.startRecognition();
                    }
                });

                Lampa.PlayerMenu.add({
                    title: 'AI Subtitles Settings',
                    subtitle: 'Configure subtitles',
                    icon: 'settings',
                    action: function () {
                        Lampa.Settings.show({
                            category: 'subtitles_sync_ai',
                            title: 'Subtitles Sync AI'
                        });
                        console.log('Opened AI Subtitles Settings in player menu');
                    }
                });

                console.log('Player menu items added');
            } else {
                console.log('Error: Lampa.PlayerMenu unavailable');
                Lampa.Noty.show('Error: PlayerMenu unavailable');
            }

            Lampa.Listener.follow('player', function (e) {
                if (e.type == 'start') {
                    _this.subtitles = [];
                    console.log('Playback started');
                    if (Lampa.Noty) Lampa.Noty.show('Ready to generate subtitles');
                }
            });
        },

        startRecognition: function () {
            if (!this.recognition) {
                console.log('Speech recognition unavailable');
                Lampa.Noty.show('Speech recognition unavailable');
                return;
            }

            this.subtitles = [];
            try {
                this.recognition.start();
                console.log('Started subtitle generation');
                Lampa.Noty.show('Generating subtitles...');
            } catch (e) {
                console.error('Error starting recognition:', e);
                Lampa.Noty.show('Start error: ' + e.message);
            }
        },

        addSubtitle: function (text) {
            var player = Lampa.Player;
            var currentTime;

            // Проверка доступности player.time()
            if (player && typeof player.time === 'function') {
                currentTime = player.time();
                console.log('Current playback time:', currentTime);
            } else {
                console.error('Player time unavailable');
                currentTime = 0; // Fallback значение
                Lampa.Noty.show('Error: Player time unavailable');
            }

            var subtitle = {
                start: currentTime,
                end: currentTime + 2,
                text: text
            };

            this.subtitles.push(subtitle);
            console.log('Adding subtitle:', subtitle);

            if (player && player.subtitles && typeof player.subtitles.add === 'function') {
                try {
                    player.subtitles.add({
                        label: 'AI Subtitles (' + this.selectedLang.split('-')[0].toUpperCase() + ')',
                        content: this.subtitles
                    });
                    console.log('Subtitles added successfully:', this.subtitles);
                } catch (e) {
                    console.error('Error adding subtitles:', e);
                    Lampa.Noty.show('Error adding subtitles: ' + e.message);
                }
            } else {
                console.error('Player subtitles API unavailable');
                Lampa.Noty.show('Error: Subtitles API unavailable');
            }
        }
    };

    SubtitlesSyncAI.init();

    if (window.Lampa && window.Lampa.Plugins) {
        window.Lampa.Plugins[SubtitlesSyncAI.name] = SubtitlesSyncAI;
        console.log('Plugin registered successfully');
    } else {
        console.log('Error: Lampa.Plugins unavailable');
    }
})();
