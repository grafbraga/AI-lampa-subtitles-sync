// plugin.js

// Задержка загрузки плагина на 500 мс
setTimeout(() => {
    const apiKey = 'D7hLVYcZiZTx9st15DTlarZdI2qP4NG5';

    // Функция включения субтитров
    function enableSubtitles() {
        Lampa.Player.on('play', async (video) => {
            try {
                // Предполагается, что у видео есть свойство title
                const title = video.title || Lampa.Player.current().title;
                if (!title) {
                    console.error('Название видео не найдено');
                    return;
                }

                // Поиск субтитров
                const subtitles = await searchSubtitles(title);
                if (subtitles && subtitles.length > 0) {
                    // Загрузка первого подходящего субтитра
                    const subtitleUrl = await downloadSubtitle(subtitles[0].id);
                    if (subtitleUrl) {
                        // Установка субтитров в плеер
                        Lampa.Player.setSubtitle(subtitleUrl);
                        console.log('Субтитры загружены:', subtitleUrl);
                    }
                } else {
                    console.log('Субтитры не найдены для:', title);
                }
            } catch (error) {
                console.error('Ошибка при загрузке субтитров:', error);
            }
        });
    }

    // Функция отключения субтитров
    function disableSubtitles() {
        Lampa.Player.setSubtitle(null); // Предполагаемый метод для отключения
        Lampa.Player.off('play'); // Отключаем слушатель событий
    }

    // Поиск субтитров через OpenSubtitles API
    async function searchSubtitles(title) {
        const url = `https://api.opensubtitles.com/api/v1/subtitles?query=${encodeURIComponent(title)}`;
        const response = await fetch(url, {
            headers: {
                'Api-Key': apiKey,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error('Ошибка поиска субтитров');
        const data = await response.json();
        return data.data; // Возвращает массив субтитров
    }

    // Загрузка субтитров по ID
    async function downloadSubtitle(subtitleId) {
        const url = `https://api.opensubtitles.com/api/v1/download`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Api-Key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ file_id: subtitleId })
        });
        if (!response.ok) throw new Error('Ошибка загрузки субтитров');
        const data = await response.json();
        return data.link; // Прямая ссылка на файл субтитров
    }

    // Добавление пункта в меню настроек
    Lampa.Settings.add('subtitles', {
        name: 'Настройки субтитров',
        type: 'toggle',
        default: false,
        onChange: (enabled) => {
            if (enabled) {
                enableSubtitles();
            } else {
                disableSubtitles();
            }
        }
    });

    console.log('Плагин субтитров загружен');
}, 500);
