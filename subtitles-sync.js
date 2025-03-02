(function() {
    // Проверяем, поддерживает ли устройство webOS
    if (window.webOS) {
        // Функция для отправки запросов к сервисам webOS
        function sendWebOSRequest(uri, params, onSuccess, onFailure) {
            webOS.service.request(uri, {
                parameters: params,
                onSuccess: onSuccess,
                onFailure: onFailure
            });
        }

        // Добавляем пункт меню "Настройки субтитров" в корневой список настроек Lampa
        Lampa.Settings.main.add('subtitles', {
            name: 'Настройки субтитров',
            template: `
                <div>
                    <div class="settings-param selector" data-type="toggle" data-name="subtitles_enabled" data-checked="true">
                        <div class="settings-param__name">Включить субтитры</div>
                    </div>
                    <div class="settings-param selector" data-type="select" data-name="subtitles_size" data-value="2">
                        <div class="settings-param__name">Размер субтитров</div>
                        <div class="settings-param__value">Стандартный</div>
                    </div>
                    <div class="settings-param selector" data-type="select" data-name="subtitles_color" data-value="2">
                        <div class="settings-param__name">Цвет субтитров</div>
                        <div class="settings-param__value">Белый</div>
                    </div>
                </div>
            `,
            onChange: function(name, value) {
                // Обработка изменений настроек
                if (name === 'subtitles_enabled') {
                    // Включение или отключение субтитров
                    sendWebOSRequest('luna://com.webos.media', {
                        method: value ? 'enableSubtitle' : 'disableSubtitle',
                        parameters: { mediaId: Lampa.Player.mediaId }
                    }, function(result) {
                        console.log('Субтитры ' + (value ? 'включены' : 'отключены'));
                    }, function(error) {
                        console.error('Ошибка при ' + (value ? 'включении' : 'отключении') + ' субтитров:', error);
                    });
                } else if (name === 'subtitles_size') {
                    // Изменение размера субтитров
                    sendWebOSRequest('luna://com.webos.media', {
                        method: 'setSubtitleFontSize',
                        parameters: {
                            mediaId: Lampa.Player.mediaId,
                            fontSize: parseInt(value)
                        }
                    }, function(result) {
                        console.log('Размер субтитров изменен на ' + value);
                    }, function(error) {
                        console.error('Ошибка при изменении размера субтитров:', error);
                    });
                } else if (name === 'subtitles_color') {
                    // Изменение цвета субтитров
                    sendWebOSRequest('luna://com.webos.media', {
                        method: 'setSubtitleColor',
                        parameters: {
                            mediaId: Lampa.Player.mediaId,
                            color: parseInt(value)
                        }
                    }, function(result) {
                        console.log('Цвет субтитров изменен на ' + value);
                    }, function(error) {
                        console.error('Ошибка при изменении цвета субтитров:', error);
                    });
                }
            }
        });

        // Функция для загрузки субтитров с USB-накопителя
        function loadSubtitlesFromUSB() {
            // Путь к файлу субтитров на USB-накопителе
            var usbPath = '/media/usb/sub.srt';
            // Проверяем наличие файла субтитров
            fetch(usbPath).then(function(response) {
                if (response.ok) {
                    // Загружаем субтитры в плеер
                    Lampa.Player.subtitles.load(usbPath);
                    console.log('Субтитры загружены с USB-накопителя');
                } else {
                    console.error('Файл субтитров не найден на USB-накопителе');
                }
            }).catch(function(error) {
                console.error('Ошибка при загрузке субтитров с USB-накопителя:', error);
            });
        }

        // Добавляем обработчик нажатия кнопки для загрузки субтитров
        document.addEventListener('keydown', function(event) {
            // Используем кнопку "5" на пульте для загрузки субтитров
            if (event.keyCode === 53) {
                loadSubtitlesFromUSB();
            }
        });

        console.log('Плагин для управления субтитрами загружен');
    } else {
        console.error('Устройство не поддерживает webOS');
    }
})();
