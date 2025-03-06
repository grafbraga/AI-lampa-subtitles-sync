// subtitle_plugin.js
(function() {
    var plugin = {
        name: 'Subtitle Plugin',
        version: '1.0.0',
        description: 'Автоматически добавляет субтитры к видео',
        author: 'Ваше имя',
        settings: {
            enabled: true
        },

        // Инициализация плагина
        init: function() {
            // Добавление пункта меню "Настройки субтитров" в корень настроек
            Lampa.Menu.add('settings', {
                title: 'Настройки субтитров',
                icon: 'subtitles',
                action: function() {
                    Lampa.Menu.open('subtitle_settings');
                }
            });

            // Определение страницы настроек субтитров
            Lampa.Menu.add('subtitle_settings', {
                title: 'Настройки субтитров',
                items: [
                    {
                        title: 'Включить субтитры автоматически',
                        type: 'toggle',
                        value: function() {
                            return Lampa.Storage.get('subtitles_enabled', true);
                        },
                        action: function(value) {
                            Lampa.Storage.set('subtitles_enabled', value);
                            if (!value) {
                                // Отключение субтитров в плеере, если выключено
                                Lampa.Player.removeSubtitle();
                            }
                        }
                    }
                ]
            });

            // Подписка на событие начала воспроизведения видео
            Lampa.Player.on('play', function() {
                if (Lampa.Storage.get('subtitles_enabled', true)) {
                    plugin.loadSubtitles();
                }
            });

            // Подписка на событие остановки видео для очистки субтитров
            Lampa.Player.on('stop', function() {
                Lampa.Player.removeSubtitle();
            });
        },

        // Функция загрузки субтитров
        loadSubtitles: function() {
            var video = Lampa.Player.currentVideo;
            if (!video) {
                console.log('Видео не найдено');
                return;
            }

            // Получение названия видео для поиска
            var title = video.title || video.name;
            if (!title) {
                console.log('Название видео отсутствует');
                return;
            }

            // Параметры OpenSubtitles API
            var apiKey = 'D7hLVYcZiZTx9st15DTlarZdI2qP4NG5';
            var searchUrl = 'https://api.opensubtitles.com/api/v1/subtitles?query=' + encodeURIComponent(title) + '&languages=ru,en';

            // Выполнение запроса через API Lampa для обхода CORS
            Lampa.Network.get(searchUrl, {
                headers: {
                    'Api-Key': apiKey,
                    'User-Agent': 'LampaTV v1.0'
                }
            }).then(function(response) {
                var data = JSON.parse(response);
                if (data.data && data.data.length > 0) {
                    // Выбор первого подходящего субтитра
                    var subtitle = data.data[0];
                    var downloadUrl = subtitle.attributes.files[0].file_url;

                    // Загрузка субтитров в плеер
                    Lampa.Player.addSubtitle(downloadUrl);
                    console.log('Субтитры загружены для: ' + title);
                } else {
                    console.log('Субтитры не найдены для: ' + title);
                }
            }).catch(function(error) {
                console.error('Ошибка при загрузке субтитров:', error);
            });
        }
    };

    // Регистрация плагина в Lampa
    Lampa.Plugin.register(plugin);
})();
