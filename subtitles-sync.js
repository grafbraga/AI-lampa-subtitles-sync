// ==LampaPlugin==
// Name: Subtitles Sync AI
// Description: Plugin for auto-generating bilingual subtitles using Web Speech API
// Version: 1.1.12
// Author: grafbraga
// ==/LampaPlugin==

(function () {
    'use strict';

    if (!window.Lampa) {
        console.log('Lampa environment not found');
        return;
    }

    var SubtitlesSyncAI = {
        name: 'SubtitlesSyncAI',
        version: '1.1.12',
        recognition: null,
        subtitles: [],
        languages: ['en-US', 'ru-RU', 'es-ES', 'fr-FR', 'de-DE'],
        selectedLang: 'en-US', // Исходный язык
        targetLang: 'ru-RU',   // Целевой язык для перевода

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
                            _this.addBilingualSubtitle(transcript);
                        }
                    }
                };

                this.recognition.onerror = function (event) {
                    console.error('Ошибка распознавания:', event.error);
                    Lampa.Noty.show('Ошибка распознавания: ' + event.error);
                };

                this.recognition.onend = function () {
                    console.log('Распознавание завершено');
                    Lampa.Noty.show('Генерация субтитров завершена');
                };
            } else {
                console.log('Web Speech API не поддерживается');
                Lampa.Noty.show('Web Speech API не поддерживается');
                return;
            }

            console.log('Инициализация Subtitles Sync AI');
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') {
                    setTimeout(function () {
                        console.log('Приложение готово, настройка плагина');
                        if (Lampa.Noty) Lampa.Noty.show('Subtitles Sync AI loaded');
                        _this.addSettings();
                        _this.setupPlayer();
                    }, 500);
                }
            });
        },

        addSettings: function () {
            var _this = this;

            console.log('Добавление настроек в корневое меню');
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
                        title: 'Исходный язык',
                        onChange: function (value) {
                            _this.selectedLang = value;
                            Lampa.Storage.set('subtitles_sync_ai_lang', value);
                            if (_this.recognition) _this.recognition.lang = value;
                            console.log('Исходный язык изменен на:', value);
                        }
                    },
                    {
                        name: 'subtitles_sync_ai_target_lang',
                        type: 'select',
                        values: this.languages.reduce(function (result, lang) {
                            result[lang] = lang.split('-')[0].toUpperCase();
                            return result;
                        }, {}),
                        default: this.targetLang,
                        title: 'Целевой язык перевода',
                        onChange: function (value) {
                            _this.targetLang = value;
                            Lampa.Storage.set('subtitles_sync_ai_target_lang', value);
                            console.log('Целевой язык изменен на:', value);
                        }
                    }
                ]
            });

            this.selectedLang = Lampa.Storage.get('subtitles_sync_ai_lang', this.selectedLang);
            this.targetLang = Lampa.Storage.get('subtitles_sync_ai_target_lang', this.targetLang);
        },

        setupPlayer: function () {
            var _this = this;

            console.log('Настройка плеера');
            if (Lampa.PlayerMenu) {
                Lampa.PlayerMenu.add({
                    title: 'AI Subtitles',
                    subtitle: 'Двуязычные субтитры локально',
                    icon: 'subtitles',
                    action: function () {
                        _this.startRecognition();
                    }
                });

                // Добавление настроек в меню плеера
                Lampa.PlayerMenu.add({
                    title: 'AI Subtitles Settings',
                    subtitle: 'Настройки субтитров',
                    icon: 'settings',
                    action: function () {
                        Lampa.Settings.show({
                            category: 'subtitles_sync_ai',
                            title: 'Subtitles Sync AI'
                        });
                        console.log('Открыты настройки субтитров в плеере');
                    }
                });

                console.log('Пункты меню добавлены');
            } else {
                console.log('Ошибка: Lampa.PlayerMenu недоступен');
                Lampa.Noty.show('Ошибка: PlayerMenu недоступен');
            }

            Lampa.Listener.follow('player', function (e) {
                if (e.type == 'start') {
                    _this.subtitles = [];
                    console.log('Воспроизведение начато');
                    if (Lampa.Noty) Lampa.Noty.show('Готов к генерации субтитров');
                }
            });
        },

        startRecognition: function () {
            if (!this.recognition) {
                console.log('Распознавание речи недоступно');
                Lampa.Noty.show('Распознавание речи недоступно');
                return;
            }

            this.subtitles = [];
            try {
                this.recognition.start();
                console.log('Начата генерация субтитров');
                Lampa.Noty.show('Генерация субтитров начата...');
            } catch (e) {
                console.error('Ошибка запуска:', e);
                Lampa.Noty.show('Ошибка запуска: ' + e.message);
            }
        },

        addBilingualSubtitle: function (originalText) {
            var player = Lampa.Player;
            var currentTime = player.time();

            // Простой локальный "перевод" (заглушка)
            var translatedText = this.translateText(originalText);
            var bilingualText = originalText + ' / ' + translatedText;

            this.subtitles.push({
                start: currentTime,
                end: currentTime + 2,
                text: bilingualText
            });

            try {
                player.subtitles.add({
                    label: 'AI Subtitles (' + this.selectedLang.split('-')[0].toUpperCase() + ' -> ' + this.targetLang.split('-')[0].toUpperCase() + ')',
                    content: this.subtitles
                });
                console.log('Добавлены двуязычные субтитры:', bilingualText);
            } catch (e) {
                console.error('Ошибка добавления субтитров:', e);
                Lampa.Noty.show('Ошибка добавления субтитров: ' + e.message);
            }
        },

        translateText: function (text) {
            // Заглушка для перевода, так как нет локального переводчика
            return '[Перевод на ' + this.targetLang + ': ' + text + ']';
        }
    };

    SubtitlesSyncAI.init();

    if (window.Lampa && window.Lampa.Plugins) {
        window.Lampa.Plugins[SubtitlesSyncAI.name] = SubtitlesSyncAI;
        console.log('Плагин успешно зарегистрирован');
    } else {
        console.log('Ошибка: Lampa.Plugins недоступен');
    }
})();
