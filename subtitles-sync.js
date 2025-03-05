(function () {
    'use strict';

    // Переменные состояния
    var enabled = true;          // Субтитры включены/выключены
    var offset = 0;              // Сдвиг времени субтитров (в секундах)
    var currentSubtitles = [];   // Текущие субтитры

    /**
     * Загрузка субтитров по названию видео
     * @param {string} title - Название видео
     */
    function fetchSubtitles(title) {
        // Пример URL с CORS-прокси; замените на реальный endpoint
        var url = 'https://cors-anywhere.herokuapp.com/https://rest.opensubtitles.org/search/query-' + encodeURIComponent(title);
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onload = function () {
            if (xhr.status === 200) {
                var data = JSON.parse(xhr.responseText);
                // Предполагаем, что первый результат содержит URL субтитров
                var subtitleUrl = data[0].SubDownloadLink;
                var subtitleXhr = new XMLHttpRequest();
                subtitleXhr.open('GET', subtitleUrl, true);
                subtitleXhr.onload = function () {
                    if (subtitleXhr.status === 200) {
                        currentSubtitles = parseSRT(subtitleXhr.responseText);
                        displaySubtitles();
                    }
                };
                subtitleXhr.send();
            }
        };
        xhr.send();
    }

    /**
     * Парсинг SRT-файла субтитров
     * @param {string} srt - Текст SRT-файла
     * @returns {Array} Массив объектов субтитров
     */
    function parseSRT(srt) {
        var lines = srt.split('\n');
        var subtitles = [];
        var current = null;
        lines.forEach(function (line) {
            if (line.trim() === '') {
                if (current) {
                    subtitles.push(current);
                    current = null;
                }
            } else if (!current) {
                current = { index: parseInt(line), time: '', text: '' };
            } else if (current.time === '') {
                current.time = line;
            } else {
                current.text += line + '\n';
            }
        });
        if (current) {
            subtitles.push(current);
        }
        return subtitles.map(function (sub) {
            var times = sub.time.split(' --> ');
            var start = parseTime(times[0]);
            var end = parseTime(times[1]);
            return { start: start, end: end, text: sub.text.trim() };
        });
    }

    /**
     * Преобразование времени SRT в секунды
     * @param {string} timeStr - Время в формате HH:MM:SS,SSS
     * @returns {number} Время в секундах
     */
    function parseTime(timeStr) {
        var parts = timeStr.split(':');
        var hours = parseInt(parts[0]);
        var minutes = parseInt(parts[1]);
        var seconds = parseFloat(parts[2].replace(',', '.'));
        return hours * 3600 + minutes * 60 + seconds;
    }

    /**
     * Отображение субтитров на видео
     */
    function displaySubtitles() {
        if (enabled && currentSubtitles.length > 0) {
            // Предполагаем, что Lampa.Player поддерживает добавление субтитров
            Lampa.Player.addSubtitles(currentSubtitles, offset);
        }
    }

    // Добавление пункта меню в настройки
    Lampa.Settings.add('subtitles', {
        name: 'Subtitles Settings',
        icon: 'subtitles',
        onclick: function () {
            Lampa.Settings.open('subtitles');
        },
        children: [
            {
                type: 'switch',
                name: 'Enable Subtitles',
                value: true,
                onchange: function (value) {
                    enabled = value;
                    if (!enabled) {
                        Lampa.Player.clearSubtitles();
                    } else {
                        displaySubtitles();
                    }
                }
            },
            {
                type: 'input',
                name: 'Offset (seconds)',
                value: '0',
                onchange: function (value) {
                    offset = parseFloat(value);
                    displaySubtitles();
                }
            }
        ]
    });

    // Слушаем событие начала воспроизведения видео
    Lampa.Player.on('play', function (videoInfo) {
        if (enabled) {
            fetchSubtitles(videoInfo.title);
        }
    });

    // Обработка нажатий кнопок пульта
    Lampa.Controller.addListener('ok', function () {
        enabled = !enabled;
        if (enabled) {
            displaySubtitles();
        } else {
            Lampa.Player.clearSubtitles();
        }
    });

    Lampa.Controller.addListener('left', function () {
        offset -= 0.5; // Сдвиг назад на 0.5 секунды
        displaySubtitles();
    });

    Lampa.Controller.addListener('right', function () {
        offset += 0.5; // Сдвиг вперед на 0.5 секунды
        displaySubtitles();
    });

    // Регистрация плагина
    Lampa.Plugin.register({
        name: 'Subtitles Sync',
        version: '1.0.0',
        description: 'Добавляет субтитры с синхронизацией',
        init: function () {
            // Код инициализации, если требуется
        }
    });
})();
