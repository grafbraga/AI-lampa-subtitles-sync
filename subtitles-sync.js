// ==LampaPlugin==
// Name: Subtitles Sync AI
// Description: Plugin for auto-generating subtitles using Web Speech API
// Version: 1.1.30
// Author: grafbraga
// ==/LampaPlugin==

(function () {
    'use strict';

    if (!window.Lampa) return;

    var SubtitlesSyncAI = {
        name: 'SubtitlesSyncAI',
        version: '1.1.3',
        recognition: null,
        subtitles: [],
        languages: ['en-US', 'ru-RU', 'es-ES', 'fr-FR', 'de-DE'],
        selectedLang: 'en-US',
        active: false,

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
                        if (event.results[i].isFinal) {
                            transcript += event.results[i][0].transcript;
                        }
                    }
                    if (transcript) {
                        _this.addSubtitle(transcript);
                    }
                };

                this.recognition.onerror = function (event) {
                    console.log('Ошибка распознавания: ' + event.error);
                    // Перезапускаем распознавание при ошибке
                    if (_this.active) {
                        setTimeout(function() {
                            try {
                                _this.recognition.start();
                            } catch (e) {
                                console.log('Ошибка перезапуска распознавания', e);
                            }
                        }, 1000);
                    }
                };

                this.recognition.onend = function() {
                    // Перезапускаем распознавание если оно всё ещё активно
                    if (_this.active) {
                        try {
                            _this.recognition.start();
                        } catch (e) {
                            console.log('Ошибка при перезапуске распознавания', e);
                        }
                    }
                };
            } else {
                console.log('Web Speech API не поддерживается в этом браузере');
                Lampa.Noty.show('Web Speech API не поддерживается в этом браузере');
                return;
            }

            // Отложенная инициализация
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

            // Добавляем в корневое меню настроек
            if (Lampa.Settings) {
                Lampa.Settings.add({
                    component: 'subtitles_sync_ai',
                    name: 'AI Субтитры',
                    icon: 'subtitles',
                    items: [
                        {
                            name: 'Выбор языка',
                            subtitle: 'Язык распознавания речи для субтитров',
                            selected: function() {
                                return _this.selectedLang.split('-')[0].toUpperCase();
                            },
                            popup: [{
                                title: 'Выберите язык',
                                items: _this.languages.map(function(lang) {
                                    return {
                                        title: lang.split('-')[0].toUpperCase(),
                                        value: lang,
                                        selected: _this.selectedLang === lang
                                    };
                                }),
                                onSelect: function(item) {
                                    _this.selectedLang = item.value;
                                    Lampa.Storage.set('subtitles_sync_ai_lang', item.value);
                                    if (_this.recognition) _this.recognition.lang = item.value;
                                    Lampa.Noty.show('Выбран язык: ' + item.title);
                                }
                            }]
                        }
                    ]
                });
            }

            // Для совместимости добавляем также через SettingsApi
            if (Lampa.SettingsApi) {
                Lampa.SettingsApi.addParam({
                    component: 'interface',
                    param: {
                        name: 'subtitles_sync_ai_lang',
                        type: 'select',
                        values: this.languages.reduce(function (result, lang) {
                            result[lang] = lang.split('-')[0].toUpperCase();
                            return result;
                        }, {}),
                        default: this.selectedLang
                    },
                    field: 'Язык субтитров AI',
                    onChange: function (value) {
                        _this.selectedLang = value;
                        Lampa.Storage.set('subtitles_sync_ai_lang', value);
                        if (_this.recognition) _this.recognition.lang = value;
                    }
                });
            }

            this.selectedLang = Lampa.Storage.get('subtitles_sync_ai_lang', this.selectedLang);
            if (this.recognition) this.recognition.lang = this.selectedLang;
        },

        setupPlayer: function () {
            var _this = this;

            if (Lampa.PlayerPanel) {
                // Добавляем в панель плеера, если она доступна
                Lampa.PlayerPanel.add({
                    name: 'subtitles_ai',
                    title: 'AI Субтитры',
                    subtitle: 'Распознавание речи',
                    icon: 'subtitles',
                    onSelect: function() {
                        _this.toggleRecognition();
                    }
                });
            }

            if (Lampa.PlayerMenu) {
                // Добавляем в меню плеера
                Lampa.PlayerMenu.add({
                    title: 'AI Субтитры',
                    subtitle: 'Генерация субтитров через AI',
                    icon: 'subtitles',
                    action: function () {
                        _this.toggleRecognition();
                    }
                });
            }

            Lampa.Listener.follow('player', function (e) {
                if (e.type == 'start') {
                    _this.subtitles = [];
                } else if (e.type == 'destroy') {
                    // Останавливаем распознавание при закрытии плеера
                    _this.stopRecognition();
                }
            });
        },

        toggleRecognition: function() {
            if (this.active) {
                this.stopRecognition();
            } else {
                this.startRecognition();
            }
        },

        startRecognition: function () {
            if (!this.recognition) {
                Lampa.Noty.show('Распознавание речи недоступно');
                return;
            }

            this.active = true;
            this.subtitles = [];
            
            try {
                this.recognition.start();
                Lampa.Noty.show('Начата генерация субтитров...');
            } catch (e) {
                console.log('Ошибка при запуске распознавания', e);
                Lampa.Noty.show('Ошибка запуска распознавания');
            }
        },

        stopRecognition: function () {
            if (!this.recognition) return;
            
            this.active = false;
            
            try {
                this.recognition.stop();
                Lampa.Noty.show('Генерация субтитров остановлена');
            } catch (e) {
                console.log('Ошибка при остановке распознавания', e);
            }
        },

        addSubtitle: function (text) {
            if (!text || !this.active) return;
            
            var player = Lampa.Player;
            if (!player) return;
            
            var currentTime = player.current().time || 0;
            
            // Создаем объект субтитра
            var subtitle = {
                start: currentTime,
                end: currentTime + 3, // Длительность субтитра 3 секунды
                text: text
            };
            
            this.subtitles.push(subtitle);
            
            // Очищаем старые субтитры, если их больше 100
            if (this.subtitles.length > 100) {
                this.subtitles = this.subtitles.slice(-100);
            }
            
            // Добавляем в плеер
            try {
                player.subtitles.update({
                    label: 'AI Subtitles (' + this.selectedLang.split('-')[0].toUpperCase() + ')',
                    content: this.subtitles
                });
                
                // Переключаемся на AI субтитры, если они еще не активны
                if (!player.subtitles.selected() || player.subtitles.selected().label !== 'AI Subtitles (' + this.selectedLang.split('-')[0].toUpperCase() + ')') {
                    player.subtitles.select('AI Subtitles (' + this.selectedLang.split('-')[0].toUpperCase() + ')');
                }
            } catch (e) {
                console.log('Ошибка при обновлении субтитров', e);
            }
        }
    };

    SubtitlesSyncAI.init();

    if (window.Lampa && window.Lampa.Plugins) {
        window.Lampa.Plugins[SubtitlesSyncAI.name] = SubtitlesSyncAI;
    }
})();
