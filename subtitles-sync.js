(function () {
    'use strict';

    // Инициализация Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    let subtitlesEnabled = false;
    let subtitleElement = null;

    // Функция добавления пункта в меню настроек
    function addSettingsMenu() {
        const settingsMenu = Lampa.Utils.getSettingsMenu();
        if (!settingsMenu) return;

        const subtitlesItem = {
            title: 'Субтитры',
            action: toggleSubtitles
        };
        Lampa.Settings.addItem(subtitlesItem);
    }

    // Включение/выключение субтитров
    function toggleSubtitles() {
        subtitlesEnabled = !subtitlesEnabled;
        if (subtitlesEnabled) {
            startSubtitles();
            Lampa.Utils.showMessage('Субтитры включены');
        } else {
            stopSubtitles();
            Lampa.Utils.showMessage('Субтитры выключены');
        }
    }

    // Создание элемента субтитров
    function createSubtitleElement() {
        if (!subtitleElement) {
            subtitleElement = document.createElement('div');
            subtitleElement.style.position = 'absolute';
            subtitleElement.style.bottom = '10%';
            subtitleElement.style.left = '0';
            subtitleElement.style.width = '100%';
            subtitleElement.style.textAlign = 'center';
            subtitleElement.style.color = 'white';
            subtitleElement.style.background = 'rgba(0, 0, 0, 0.5)';
            subtitleElement.style.padding = '5px';
            subtitleElement.style.fontSize = '20px';
            subtitleElement.style.zIndex = '1000';
            document.querySelector('.player-video').appendChild(subtitleElement);
        }
    }

    // Запуск субтитров
    function startSubtitles() {
        if (!SpeechRecognition) {
            Lampa.Utils.showMessage('Ваш браузер не поддерживает субтитры');
            subtitlesEnabled = false;
            return;
        }

        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'ru-RU'; // Можно добавить выбор языка в будущем

        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0].transcript)
                .join('');
            updateSubtitles(transcript);
        };

        recognition.onerror = (event) => {
            console.error('Ошибка распознавания:', event.error);
            stopSubtitles();
        };

        createSubtitleElement();
        recognition.start();
    }

    // Обновление текста субтитров
    function updateSubtitles(text) {
        if (subtitleElement) {
            subtitleElement.textContent = text;
        }
    }

    // Остановка субтитров
    function stopSubtitles() {
        if (recognition) {
            recognition.stop();
            recognition = null;
        }
        if (subtitleElement) {
            subtitleElement.remove();
            subtitleElement = null;
        }
    }

    // Инициализация плагина
    function init() {
        // Ждем загрузки Lampa
        Lampa.Listener.follow('app', (e) => {
            if (e.type === 'ready') {
                addSettingsMenu();
            }
        });
    }

    // Запуск плагина
    init();
})();
