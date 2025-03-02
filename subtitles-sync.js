(function () {
    'use strict';

    // Описание плагина
    var plugin = {
        url: 'https://yourusername.github.io/subtitles.js', // Замените на ваш GitHub Pages URL
        status: 1,
        name: 'Simple Subtitles',
        author: 'Grok 3 @ xAI'
    };

    // Элемент меню настроек
    var menu_item = {
        title: 'Subtitles',
        subtitle: 'Enable real-time subtitles',
        icon: 'closed_caption',
        on: false,
        action: function () {
            this.on = !this.on;
            toggleSubtitles(this.on);
            Lampa.Storage.set('subtitles_enabled', this.on);
            Lampa.Settings.update();
        }
    };

    // Интеграция в корневое меню настроек
    Lampa.Settings.main().after(function () {
        var params = Lampa.Settings.main().params;
        menu_item.on = Lampa.Storage.get('subtitles_enabled', false);
        params.menu.push(menu_item);
    });

    // Глобальные переменные
    var recognition;
    var subtitles_container;

    // Переключение субтитров
    function toggleSubtitles(enabled) {
        if (enabled) {
            startSubtitles();
        } else {
            stopSubtitles();
        }
    }

    // Запуск субтитров
    function startSubtitles() {
        // Проверка поддержки Web Speech API
        var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            Lampa.Noty.show('Web Speech API not supported on this device.');
            menu_item.on = false;
            Lampa.Settings.update();
            return;
        }

        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US'; // Можно добавить выбор языка в будущем

        // Создание контейнера для субтитров
        subtitles_container = document.createElement('div');
        subtitles_container.style.position = 'absolute';
        subtitles_container.style.bottom = '10%';
        subtitles_container.style.left = '0';
        subtitles_container.style.right = '0';
        subtitles_container.style.textAlign = 'center';
        subtitles_container.style.color = 'white';
        subtitles_container.style.background = 'rgba(0, 0, 0, 0.7)';
        subtitles_container.style.padding = '10px';
        subtitles_container.style.fontSize = '18px';
        subtitles_container.style.zIndex = '1000';
        document.body.appendChild(subtitles_container);

        // Обработка результатов распознавания
        recognition.onresult = function (event) {
            var transcript = '';
            for (var i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            updateSubtitles(transcript);
        };

        // Обработка ошибок
        recognition.onerror = function (event) {
            Lampa.Noty.show('Subtitles error: ' + event.error);
        };

        // Синхронизация с плеером
        Lampa.Player.listeners.push({
            update: function (player) {
                if (subtitles_container) {
                    subtitles_container.dataset.time = player.currentTime;
                }
            }
        });

        recognition.start();
        Lampa.Noty.show('Subtitles enabled');
    }

    // Остановка субтитров
    function stopSubtitles() {
        if (recognition) {
            recognition.stop();
            recognition = null;
        }
        if (subtitles_container) {
            subtitles_container.remove();
            subtitles_container = null;
        }
        Lampa.Noty.show('Subtitles disabled');
    }

    // Обновление субтитров
    function updateSubtitles(text) {
        if (subtitles_container) {
            var time = subtitles_container.dataset.time || 0;
            subtitles_container.innerText = `[${formatTime(time)}] ${text}`;
        }
    }

    // Форматирование времени
    function formatTime(seconds) {
        var minutes = Math.floor(seconds / 60);
        var secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' + secs : secs}`;
    }

    // Регистрация плагина
    Lampa.Plugin.register(plugin);
})();
