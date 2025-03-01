// ==LampaPlugin==
// Name: Subtitles Sync AI
// Description: Plugin for auto-generating subtitles using Web Speech API
// Version: 1.1.21
// Author: grafbraga
// ==/LampaPlugin==

(function () {
    'use strict';

    if (!window.Lampa) return;

    var SubtitlesSyncAI = {
        name: 'SubtitlesSyncAI',
        version: '1.1.21',
        recognition: null,
        subtitles: [],
        languages: ['en-US', 'ru-RU', 'es-ES', 'fr-FR', 'de-DE'],
        selectedLang: 'en-US',
        active: false,
        subtitleElement: null,

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
                return;
            }

            // Отложенная инициализация
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') {
                    setTimeout(function () {
                        _this.addSettings();
                        _this.setupPlayer();
                        _this.createSubtitleElement();
                    }, 500);
                }
            });
        },

        addSettings: function () {
            var _this = this;

            Lampa.Settings.add('subtitles_sync_ai', {
                name: 'Subtitles Sync AI',
                index: -1, // Для верхнего положения в меню
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
            if (this.recognition) this.recognition.lang = this.selectedLang;
        },

        setupPlayer: function () {
            var _this = this;

            if (Lampa.PlayerMenu) {
                Lampa.PlayerMenu.add({
                    title: 'AI Subtitles',
                    subtitle: 'Генерация субтитров через AI',
                    icon: 'subtitles',
                    action: function () {
                        _this.toggleSubtitles();
                    }
                });
            }

            // Добавляем обработчик события на начало воспроизведения
            Lampa.Listener.follow('player', function(e) {
                if (e.type === 'start') {
                    // Создаем элемент для субтитров, если он еще не создан
                    _this.createSubtitleElement();
                } else if (e.type === 'destroy') {
                    // Останавливаем распознавание при закрытии плеера
                    _this.stopRecognition();
                }
            });
        },

        createSubtitleElement: function() {
            // Проверяем, существует ли уже элемент для субтитров
            if (!this.subtitleElement) {
                this.subtitleElement = document.createElement('div');
                this.subtitleElement.className = 'ai-subtitles';
                this.subtitleElement.style.cssText = 'position: absolute; bottom: 70px; left: 0; width: 100%; text-align: center; z-index: 9999; font-size: 24px; color: white; text-shadow: 0 0 3px black; padding: 10px; display: none;';
                document.body.appendChild(this.subtitleElement);
            }
        },

        toggleSubtitles: function() {
            if (this.active) {
                this.stopRecognition();
                Lampa.Noty.show('AI Субтитры отключены');
            } else {
                this.startRecognition();
                Lampa.Noty.show('AI Субтитры включены');
            }
        },

        startRecognition: function() {
            if (!this.recognition) return;
            
            this.active = true;
            this.subtitles = [];
            
            if (this.subtitleElement) {
                this.subtitleElement.style.display = 'block';
            }
            
            try {
                this.recognition.start();
            } catch (e) {
                console.log('Ошибка при запуске распознавания', e);
            }
        },

        stopRecognition: function() {
            if (!this.recognition) return;
            
            this.active = false;
            
            if (this.subtitleElement) {
                this.subtitleElement.style.display = 'none';
                this.subtitleElement.textContent = '';
            }
            
            try {
                this.recognition.stop();
            } catch (e) {
                console.log('Ошибка при остановке распознавания', e);
            }
        },

        addSubtitle: function(text) {
            if (!text || !this.active) return;
            
            var currentTime = new Date().getTime();
            
            this.subtitles.push({
                text: text,
                time: currentTime
            });
            
            // Ограничиваем количество хранимых субтитров
            if (this.subtitles.length > 10) {
                this.subtitles.shift();
            }
            
            // Отображаем субтитры
            this.showSubtitles();
        },

        showSubtitles: function() {
            if (!this.subtitleElement || this.subtitles.length === 0) return;
            
            // Показываем последний субтитр
            var latestSubtitle = this.subtitles[this.subtitles.length - 1];
            this.subtitleElement.textContent = latestSubtitle.text;
            
            // Автоматически скрываем субтитры через 5 секунд
            var _this = this;
            setTimeout(function() {
                if (_this.subtitles.length > 0 && _this.subtitles[_this.subtitles.length - 1] === latestSubtitle) {
                    // Удаляем только если это все еще последний субтитр
                    _this.subtitleElement.textContent = '';
                }
            }, 5000);
        }
    };

    // Инициализация плагина
    SubtitlesSyncAI.init();

})();
