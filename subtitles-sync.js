// ==LampaPlugin==
// Name: Subtitles Sync AI
// Description: Plugin for auto-generating subtitles using Web Speech API
// Version: 1.1.26
// Author: grafbraga & Grok3-xAI
// ==/LampaPlugin==

(function () {
    'use strict';

    if (!window.Lampa) {
        console.log('[SubtitlesSyncAI] Lampa environment not found');
        return;
    }

    var SubtitlesSyncAI = {
        name: 'SubtitlesSyncAI',
        version: '1.1.26',
        recognition: null,
        subtitles: [],
        languages: ['en-US', 'ru-RU', 'es-ES', 'fr-FR', 'de-DE'],
        selectedLang: 'en-US',
        active: false,

        init: function () {
            var _this = this;

            console.log('[SubtitlesSyncAI] Initializing plugin');

            // Загружаем сохраненные настройки перед инициализацией
            this.selectedLang = Lampa.Storage.get('subtitles_sync_ai_lang', this.selectedLang);

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
                        if (event.results[i].isFinal) {
                            transcript += event.results[i][0].transcript;
                        }
                    }
                    if (transcript) {
                        console.log('[SubtitlesSyncAI] Recognized text:', transcript);
                        _this.addSubtitle(transcript);
                    }
                };

                this.recognition.onerror = function (event) {
                    console.log('[SubtitlesSyncAI] Recognition error:', event.error);
                    Lampa.Noty.show('Ошибка распознавания: ' + event.error);
                    // Перезапуск при ошибке
                    if (_this.active) {
                        setTimeout(function () {
                            try {
                                _this.recognition.start();
                                console.log('[SubtitlesSyncAI] Restarted recognition after error');
                            } catch (e) {
                                console.log('[SubtitlesSyncAI] Error restarting recognition:', e);
                            }
                        }, 1000);
                    }
                };

                this.recognition.onend = function () {
                    console.log('[SubtitlesSyncAI] Recognition ended');
                    // Перезапуск, если активно
                    if (_this.active) {
                        setTimeout(function () {
                            try {
                                _this.recognition.start();
                                console.log('[SubtitlesSyncAI] Restarted recognition');
                            } catch (e) {
                                console.log('[SubtitlesSyncAI] Error restarting recognition:', e);
                            }
                        }, 1000);
                    }
                };
            } else {
                console.log('[SubtitlesSyncAI] Web Speech API not supported');
                Lampa.Noty.show('Web Speech API не поддерживается в этом браузере');
                return;
            }

            // Отложенная инициализация
            this.addToApp();
        },

        addToApp: function () {
            var _this = this;

            console.log('[SubtitlesSyncAI] Setting up app listeners');
            if (window.appready) {
                this.addSettings();
                this.setupPlayer();
                console.log('[SubtitlesSyncAI] App already ready, configured plugin');
            } else {
                Lampa.Listener.follow('app', function (e) {
                    if (e.type === 'ready') {
                        setTimeout(function () {
                            if (Lampa.Noty) Lampa.Noty.show('Subtitles Sync AI v1.1.26 loaded');
                            _this.addSettings();
                            _this.setupPlayer();
                            console.log('[SubtitlesSyncAI] App ready, configured plugin');
                        }, 500);
                    }
                });
            }
        },

        addSettings: function () {
            var _this = this;

            console.log('[SubtitlesSyncAI] Adding settings to root menu');
            if (Lampa.Settings && !Lampa.Settings.exist('subtitles_sync_ai')) {
                var langValues = {};
                this.languages.forEach(function (lang) {
                    langValues[lang] = lang.split('-')[0].toUpperCase();
                });

                Lampa.Settings.create('subtitles_sync_ai', {
                    title: 'AI Субтитры',
                    icon: 'subtitles',
                    component: 'subtitles_sync_ai',
                    id: 'subtitles_sync_ai'
                });

                Lampa.Settings.inject('subtitles_sync_ai', {
                    component: 'subtitles_sync_ai',
                    name: 'subtitles_sync_ai_lang',
                    type: 'select',
                    values: langValues,
                    default: this.selectedLang,
                    title: 'Язык субтитров',
                    onChange: function (value) {
                        _this.selectedLang = value;
                        Lampa.Storage.set('subtitles_sync_ai_lang', value);
                        if (_this.recognition) _this.recognition.lang = value;
                        console.log('[SubtitlesSyncAI] Language set to:', value);
                    }
                });
            }
        },

        setupPlayer: function () {
            var _this = this;

            console.log('[SubtitlesSyncAI] Setting up player');
            if (Lampa.PlayerMenu) {
                Lampa.PlayerMenu.add({
                    title: 'AI Субтитры',
                    subtitle: 'Генерация субтитров через AI',
                    icon: 'subtitles',
                    action: function () {
                        _this.toggleRecognition();
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

            if (Lampa.PlayerPanel) {
                Lampa.PlayerPanel.add({
                    component: 'subtitles_sync_ai',
                    name: 'subtitles_ai',
                    position: 'center',
                    icon: '<svg height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.5 11.5H14.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7.5 15.5H16.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path fill-rule="evenodd" clip-rule="evenodd" d="M2.5 12C2.5 7.52166 2.5 5.28249 3.89124 3.89124C5.28249 2.5 7.52166 2.5 12 2.5C16.4783 2.5 18.7175 2.5 20.1088 3.89124C21.5 5.28249 21.5 7.52166 21.5 12C21.5 16.4783 21.5 18.7175 20.1088 20.1088C18.7175 21.5 16.4783 21.5 12 21.5C7.52166 21.5 5.28249 21.5 3.89124 20.1088C2.5 18.7175 2.5 16.4783 2.5 12Z" stroke="currentColor" stroke-width="2"/></svg>',
                    onClick: function () {
                        _this.toggleRecognition();
                    }
                });
                console.log('[SubtitlesSyncAI] Player panel item added');
            }

            Lampa.Listener.follow('player', function (e) {
                if (e.type === 'start') {
                    _this.subtitles = [];
                    console.log('[SubtitlesSyncAI] Playback started');
                } else if (e.type === 'destroy') {
                    _this.stopRecognition();
                    console.log('[SubtitlesSyncAI] Playback destroyed');
                }
            });
        },

        toggleRecognition: function () {
            if (this.active) {
                this.stopRecognition();
            } else {
                this.startRecognition();
            }
        },

        startRecognition: function () {
            if (!this.recognition) {
                console.log('[SubtitlesSyncAI] Speech recognition unavailable');
                Lampa.Noty.show('Распознавание речи недоступно');
                return;
            }

            this.active = true;
            this.subtitles = [];
            try {
                this.recognition.start();
                console.log('[SubtitlesSyncAI] Started subtitle generation');
                Lampa.Noty.show('Начата генерация субтитров...');
            } catch (e) {
                console.log('[SubtitlesSyncAI] Error starting recognition:', e);
                Lampa.Noty.show('Ошибка запуска распознавания');
                this.active = false;
            }
        },

        stopRecognition: function () {
            if (!this.recognition) return;

            this.active = false;
            try {
                this.recognition.stop();
                console.log('[SubtitlesSyncAI] Stopped subtitle generation');
                Lampa.Noty.show('Генерация субтитров остановлена');
            } catch (e) {
                console.log('[SubtitlesSyncAI] Error stopping recognition:', e);
            }
        },

        addSubtitle: function (text) {
            if (!text || !this.active) return;

            var player = Lampa.Player;
            if (!player || !player.currentTime) {
                console.log('[SubtitlesSyncAI] Player or currentTime unavailable');
                return;
            }

            var currentTime = player.currentTime();
            if (typeof currentTime !== 'number') {
                console.log('[SubtitlesSyncAI] Invalid currentTime:', currentTime);
                return;
            }

            var subtitle = {
                start: currentTime,
                end: currentTime + 3, // Длительность субтитра 3 секунды
                text: text
            };

            this.subtitles.push(subtitle);

            if (this.subtitles.length > 100) {
                this.subtitles = this.subtitles.slice(-100);
            }

            var langLabel = 'AI Субтитры (' + this.selectedLang.split('-')[0].toUpperCase() + ')';
            try {
                if (player.subtitles) {
                    var subtitleExists = false;
                    player.subtitles.tracks().forEach(function (track) {
                        if (track.label === langLabel) {
                            subtitleExists = true;
                        }
                    });

                    if (!subtitleExists) {
                        player.subtitles.add({
                            label: langLabel,
                            url: '',
                            index: -1,
                            ready: true,
                            content: this.subtitles
                        });
                    } else {
                        player.subtitles.update({
                            label: langLabel,
                            content: this.subtitles
                        });
                    }

                    player.subtitles.select(langLabel);
                    console.log('[SubtitlesSyncAI] Subtitles added/updated:', subtitle);
                } else {
                    console.log('[SubtitlesSyncAI] Player subtitles unavailable');
                }
            } catch (e) {
                console.log('[SubtitlesSyncAI] Error adding subtitles:', e);
            }
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
