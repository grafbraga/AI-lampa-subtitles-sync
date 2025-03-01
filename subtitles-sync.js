(function () {
  // Проверка поддержки Web Speech API
  if (!('webkitSpeechRecognition' in window)) {
    alert('Ваш браузер не поддерживает Web Speech API. Используйте Chrome или Edge.');
    return;
  }

  // Инициализация распознавания речи
  const recognition = new webkitSpeechRecognition();
  recognition.continuous = true; // Непрерывное распознавание
  recognition.interimResults = true; // Промежуточные результаты
  recognition.lang = 'ru-RU'; // Язык по умолчанию (можно настроить)

  let subtitlesActive = false;
  let subtitleContainer = null;

  // Функция для создания контейнера субтитров
  function createSubtitleContainer() {
    if (!subtitleContainer) {
      subtitleContainer = document.createElement('div');
      subtitleContainer.id = 'custom-subtitles';
      subtitleContainer.style.cssText = `
        position: absolute;
        bottom: 10%;
        left: 0;
        right: 0;
        text-align: center;
        color: white;
        background: rgba(0, 0, 0, 0.7);
        padding: 10px;
        font-size: 18px;
        z-index: 1000;
      `;
      document.querySelector('.player-video')?.appendChild(subtitleContainer);
    }
  }

  // Обработка результатов распознавания
  recognition.onresult = (event) => {
    let interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        subtitleContainer.innerHTML = transcript;
      } else {
        interimTranscript += transcript;
      }
    }
    if (interimTranscript) subtitleContainer.innerHTML = interimTranscript;
  };

  recognition.onerror = (event) => {
    console.error('Ошибка распознавания:', event.error);
    subtitleContainer.innerHTML = 'Ошибка субтитров';
  };

  // Функция переключения субтитров
  function toggleSubtitles() {
    subtitlesActive = !subtitlesActive;
    if (subtitlesActive) {
      createSubtitleContainer();
      recognition.start();
      subtitleContainer.innerHTML = 'Субтитры включены...';
    } else {
      recognition.stop();
      if (subtitleContainer) {
        subtitleContainer.remove();
        subtitleContainer = null;
      }
    }
  }

  // Интеграция в меню настроек Lampa
  const menuItem = {
    title: 'Субтитры (Web Speech)',
    subtitle: 'Вкл/Выкл субтитры в одно нажатие',
    onSelect: toggleSubtitles,
  };

  // Добавление в корневой список настроек
  Lampa.Settings.add('subtitles_plugin', menuItem);

  // Автоматическая остановка при закрытии видео
  Lampa.Listener.follow('player_exit', () => {
    if (subtitlesActive) {
      recognition.stop();
      subtitlesActive = false;
      if (subtitleContainer) subtitleContainer.remove();
    }
  });

  console.log('Плагин субтитров загружен!');
})();
