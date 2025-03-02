(function() {
    // Проверяем поддержку SpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    let recognition = null;
    let videoElement = null;
    let textTrack = null;
    let lastCueEnd = 0;

    const SubtitlePlugin = {
        init() {
            // Добавляем переключатель в настройки
            Lampa.Settings.addParam({
                component: 'main',
                param: {
                    name: 'ai_subtitles',
                    type: 'toggle',
                    title: 'AI Субтитры'
                }
            });

            // Следим за запуском видео
            Lampa.Listener.follow('app', (e) => {
                if (e.name === 'video') this.onVideoStart();
                if (e.name === 'video_destroy') this.onVideoStop();
            });
        },

        onVideoStart() {
            videoElement = document.querySelector('video');
            if (!videoElement) return;

            // Создаем текстовую дорожку
            textTrack = videoElement.addTextTrack('subtitles', 'AI Subtitles', 'en');
            textTrack.mode = 'showing';

            // Запускаем распознавание при включенной опции
            if (Lampa.Settings.get('ai_subtitles')) {
                this.startRecognition();
            }
        },

        startRecognition() {
            if (!videoElement) return;

            recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = Lampa.Storage.get('language', 'en') === 'ru' ? 'ru-RU' : 'en-US';

            recognition.onresult = (e) => {
                const results = e.results;
                const currentTime = videoElement.currentTime;
                
                for (let i = e.resultIndex; i < results.length; i++) {
                    const transcript = results[i][0].transcript.trim();
                    if (transcript && results[i].isFinal) {
                        const cue = new VTTCue(
                            lastCueEnd > currentTime ? lastCueEnd : currentTime,
                            currentTime + 5, // Фиксированная длительность субтитра
                            transcript
                        );
                        
                        textTrack.addCue(cue);
                        lastCueEnd = cue.endTime;
                    }
                }
            };

            recognition.start();
        },

        onVideoStop() {
            if (recognition) {
                recognition.stop();
                recognition = null;
            }
            videoElement = null;
            textTrack = null;
            lastCueEnd = 0;
        }
    };

    // Инициализация плагина
    Lampa.Plugin.register('ai_subtitles', SubtitlePlugin);
    Lampa.Plugin.start('ai_subtitles');
})();
