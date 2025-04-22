// Audio logic for glossary page
// Supports alternating audio for Ameshaspands/Ameshaspentas and standard for others

(function() {
    // Map of term IDs to audio filenames (without extension)
    const audioMap = {
        'ahura-mazda': 'Ahura mazda',
        'ameshaspands': ['ameshaspand', 'Ameshaspenta'], // alternate
        'angra-mainyu': 'angramainyu',
        'asha': 'asha',
        'ashoi': 'ashoi',
        'avesta': 'Avesta',
        'ba-name-yazade': 'ba name yazade',
        'doa': 'doa',
        'druj': 'druj',
        'fravashi': 'Fravashi',
        'furrokh': 'Furrokh',
        'geh': 'geh',
        'gavashni': 'Gavashni',
        'hormuzd': 'hormuzd',
        'khshnaothra': 'Kshnaothra Ahurahe mazda',
        'kunashni': 'kunashni',
        'mah': 'mah',
        'manashni': 'manashni',
        'mazdayasni': 'mazdayasni',
        'mino': 'mino',
        'neyayesh': 'neyayesh',
        'roj': 'roj',
        'spenta-mainyu': 'spentamainyu',
        'sraosha': 'sraosha',
        'urvan': 'urvan',
        'ushta-te': 'ushta te',
        'vohu-manah': 'vohu manah',
        'yazads': 'yazad'
    };

    // Track toggle state for Ameshaspands
    let ameshaToggle = 0;
    let playingAudio = null;

    function stopCurrentAudio() {
        if (playingAudio) {
            playingAudio.pause();
            playingAudio.currentTime = 0;
            playingAudio = null;
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        document.body.addEventListener('click', function(e) {
            if (e.target.closest('.audio-button')) {
                const btn = e.target.closest('.audio-button');
                const termId = btn.getAttribute('data-id');
                stopCurrentAudio();

                // Remove playing class from all
                document.querySelectorAll('.audio-button').forEach(b => b.classList.remove('playing'));

                let audioSrc;
                if (termId === 'ameshaspands') {
                    const files = audioMap[termId];
                    audioSrc = `../media/audio/${files[ameshaToggle % 2]}.mp4`;
                    ameshaToggle++;
                } else if (audioMap[termId]) {
                    audioSrc = `../media/audio/${audioMap[termId]}.mp4`;
                } else {
                    return;
                }
                const audio = new Audio(audioSrc);
                playingAudio = audio;
                btn.classList.add('playing');
                audio.play();
                audio.onended = function() {
                    btn.classList.remove('playing');
                    playingAudio = null;
                };
            }
        });
    });
})();
