(function () {
    'use strict';

    // Регистрируем плагин в системе Lampa TV
    Lampa.Plugin.register({
        name: 'Subtitles Sync',
        version: '1.0.0',
        description: 'Добавляет субтитры с возможностью синхронизации',
        init: function () {
            // Переменные для управления состоянием плагина
            let subtitlesActive = false;      // Состояние показа субтитров
            let subtitleOffset = 0;           // Смещение времени (в секундах)
            let subtitlesData = null;         // Загруженные данные субтитров
            let subtitleContainer = null;     // Элемент для отображения субтитров

            // Функция для создания оверлея субтитров
            function createSubtitleOverlay() {
                subtitleContainer = document.createElement('div');
                subtitleContainer.style.position = 'absolute';
                subtitleContainer.style.bottom = '10%';
                subtitleContainer.style.width = '100%';
                subtitleContainer.style.textAlign = 'center';
                subtitleContainer.style.fontSize = '20px';
                subtitleContainer.style.color = '#FFF';
                subtitleContainer.style.textShadow = '2px 2px 4px #000';
                subtitleContainer.style.pointerEvents = 'none';
                subtitleContainer.style.zIndex = '1000';
                // Добавляем контейнер в область плеера Lampa
                let player_container = document.querySelector('.player_container') || document.body;
                player_container.appendChild(subtitleContainer);
            }

            // Функция загрузки субтитров с открытой базы с использованием CORS-прокси
            function fetchSubtitles() {
                // Пример URL запроса – здесь используется вымышленный endpoint для OpenSubtitles
                let videoId = Lampa.Player.data.id || 'default';
                let url = 'https://cors-anywhere.herokuapp.com/https://api.opensubtitles.org/xml-rpc?video=' + videoId;
                
                fetch(url)
                    .then(function (response) {
                        return response.json();
                    })
                    .then(function (data) {
                        subtitlesData = data;
                        console.log('Subtitles loaded:', subtitlesData);
                    })
                    .catch(function (error) {
                        console.error('Ошибка загрузки субтитров:', error);
                    });
            }

            // Функция отображения субтитров на основе текущего времени плеера и смещения
            function updateSubtitles() {
                if (!subtitlesActive || !subtitlesData) return;
                let currentTime = Lampa.Player.video.currentTime + subtitleOffset;
                // Простейший парсер – находим строку для текущего времени
                let currentSubtitle = subtitlesData.find(function (item) {
                    return currentTime >= item.start && currentTime <= item.end;
                });
                subtitleContainer.innerHTML = currentSubtitle ? currentSubtitle.text : '';
            }

            // Функция переключения состояния субтитров (вкл/выкл)
            function toggleSubtitles() {
                subtitlesActive = !subtitlesActive;
                if (subtitlesActive) {
                    // Если включаем, создаем оверлей и загружаем субтитры
                    if (!subtitleContainer) createSubtitleOverlay();
                    fetchSubtitles();
                    console.log('Субтитры включены');
                } else {
                    // Если выключаем, очищаем оверлей
                    if (subtitleContainer) subtitleContainer.innerHTML = '';
                    console.log('Субтитры выключены');
                }
            }

            // Функция синхронизации – изменение смещения субтитров
            function adjustSubtitleOffset(delta) {
                subtitleOffset += delta;
                console.log('Смещение субтитров:', subtitleOffset, 'секунд');
            }

            // Подписка на события пульта через Lampa.Controller
            Lampa.Controller.add('subtitles', {
                // OK – переключение субтитров
                ok: function () {
                    toggleSubtitles();
                },
                // Стрелка влево – уменьшение смещения
                left: function () {
                    adjustSubtitleOffset(-0.5);
                },
                // Стрелка вправо – увеличение смещения
                right: function () {
                    adjustSubtitleOffset(0.5);
                }
            });

            // Интервал обновления субтитров (например, каждую секунду)
            setInterval(updateSubtitles, 500);

            // Добавляем новый пункт меню в настройки Lampa TV
            Lampa.Settings.add({
                name: 'Subtitles Settings',
                description: 'Управление отображением субтитров и их синхронизацией',
                type: 'toggle', // простой переключатель
                // Начальное состояние переключателя
                value: subtitlesActive,
                // Callback при изменении
                callback: function (value) {
                    subtitlesActive = value;
                    if (subtitlesActive) {
                        if (!subtitleContainer) createSubtitleOverlay();
                        fetchSubtitles();
                    } else if (subtitleContainer) {
                        subtitleContainer.innerHTML = '';
                    }
                }
            });

            console.log('Плагин Subtitles Sync инициализирован');
        }
    });
})();
