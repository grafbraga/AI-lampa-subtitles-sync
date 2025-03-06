(function() {
    "use strict";
    // Задержка инициализации плагина на 500 мс
    setTimeout(function() {
        // Проверка наличия объекта Lampa и его настроек
        if(window.lampa && window.lampa.settings && typeof window.lampa.settings.add === 'function'){
            // Добавляем новый пункт в корневое меню настроек Lampa
            window.lampa.settings.add('subtitle_settings', {
                title: 'Настройки субтитров',
                // Иконку можно задать по необходимости
                icon: 'subtitles',
                // Обработчик клика – переключение субтитров
                handler: function(){
                    toggleSubtitles();
                }
            });
        } else {
            console.warn('Не удалось найти настройки Lampa TV для добавления плагина субтитров.');
        }

        // Добавляем обработчик клавиатуры для быстрого включения/выключения (нажатием S или s)
        document.addEventListener('keydown', function(e) {
            if(e.key === 's' || e.key === 'S'){
                toggleSubtitles();
            }
        });

        // Создаём элемент для отображения субтитров (оверлей)
        var subtitleDiv = document.createElement('div');
        subtitleDiv.style.position = 'absolute';
        subtitleDiv.style.bottom = '10%';
        subtitleDiv.style.width = '100%';
        subtitleDiv.style.textAlign = 'center';
        subtitleDiv.style.color = '#FFF';
        subtitleDiv.style.textShadow = '2px 2px 4px #000';
        subtitleDiv.style.fontSize = '20px';
        subtitleDiv.style.zIndex = '9999';
        subtitleDiv.style.pointerEvents = 'none';
        subtitleDiv.style.display = 'none';
        document.body.appendChild(subtitleDiv);

        // Флаг состояния субтитров и идентификатор интервала для синхронизации
        var subtitlesEnabled = false;
        var subtitleInterval = null;

        // Пример набора субтитров (в формате: время начала, конца и текст)
        var subtitles = [
            { start: 0,  end: 5,  text: "Привет, это тест субтитры." },
            { start: 5,  end: 10, text: "Смотрите Lampa TV." },
            { start: 10, end: 15, text: "Наслаждайтесь просмотром!" }
        ];

        // Функция переключения субтитров
        function toggleSubtitles() {
            subtitlesEnabled = !subtitlesEnabled;
            if(subtitlesEnabled){
                subtitleDiv.style.display = 'block';
                startSubtitleSync();
            } else {
                subtitleDiv.style.display = 'none';
                stopSubtitleSync();
            }
        }

        // Функция запуска синхронизации субтитров с видео
        function startSubtitleSync() {
            // Поиск элемента видео на странице
            var video = document.querySelector('video');
            if(!video){
                console.warn('Видео не найдено на странице.');
                return;
            }
            // Интервал проверки текущего времени видео каждые 200 мс
            subtitleInterval = setInterval(function(){
                var currentTime = video.currentTime;
                // Поиск субтитра, подходящего под текущее время
                var currentSubtitle = subtitles.find(function(item){
                    return currentTime >= item.start && currentTime <= item.end;
                });
                subtitleDiv.innerText = currentSubtitle ? currentSubtitle.text : '';
            }, 200);
        }

        // Функция остановки синхронизации субтитров
        function stopSubtitleSync() {
            if(subtitleInterval){
                clearInterval(subtitleInterval);
                subtitleInterval = null;
            }
        }

        // Здесь можно добавить дополнительную логику:
        // • Автоматическую подгрузку субтитров из открытых баз (с учётом CORS и ограничений API)
        // • Использование Web Speech API для генерации субтитров в реальном времени
        // Однако в рамках автономной работы и без серверных обращений данный пример использует встроенные субтитры.

    }, 500); // задержка 500 мс для загрузки плагина
})();
