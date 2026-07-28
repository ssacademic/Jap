/* नाम जप — configuration
   ─────────────────────────────────────────────────────────────
   This is the only file you need to edit to change what the app
   contains: the naam list, the music, the tuning numbers, and all
   wording. No logic lives here. app.js reads it and never writes it.
*/

const CFG = {
  VERSION:   '5.2',
  MALA:      108,             // beads in one mala
  DAY_START: 4,               // a jap "day" turns over at 04:00, not midnight
  IDLE_MS:   5 * 60 * 1000,   // gap after which a new sitting begins
  LOG_CAP:   400,             // days of history retained
  DRAG_PX:   6,               // movement before a tap becomes a drag
  TOP_PAD:   26,              // space reserved for the readout
  HIST_DAYS: 30,              // bars in the history strip
  GLIDE:     { min: 0.12, max: 0.70, divisor: 1400 }, // how the naam's travel time follows your rhythm
  // Auto-drift range. The 300 ms floor is deliberate: faster than roughly three
  // changes per second, a large moving coloured element becomes a flicker risk.
  AUTO:      { min: 300, max: 10000, step: 100 },
  RIPPLE_MAX: 6                                       // concurrent ripples kept alive
};

/* Naam list — add, remove or reorder freely. */
const NAAMS = [
  'जय श्री राम',
  'राम राम',
  'सीताराम सीताराम',
  'जय श्री सीता राम',
  'हरे कृष्ण हरे राम',
  'राम कृष्ण हरि',
  'हरि हरि',
  'ॐ नमः शिवाय',
  'हर हर महादेव',
  'ॐ गं गणपतये नमः',
  'जय माता की',
  'जय माँ काली',
  'ॐ',
  'वाहेगुरु',
  'णमोकार'
];

/* Music — streamed from archive.org, so it needs a connection and the links
   can rot over time. Verify occasionally; drop or replace freely.            */
const TRACKS = {
  indian: [
    { t:'बाँसुरी — Positive Vibes', u:'https://archive.org/download/IndianSitarInstrumentalMusic10Hours/Indian%20Flute%20Meditation%20Music%20Pure%20Positive%20Vibes%20Instrumental%20Music%20for%20Meditation%20and%20Yoga.mp3' },
    { t:'बाँसुरी — Krishna',        u:'https://archive.org/download/IndianSitarInstrumentalMusic10Hours/Indian%20Meditation%20Music%20for%20Positive%20Energy%20Flute%20Music%20Indian%20Krishna%20Instrumental.mp3' },
    { t:'बाँसुरी — Relaxation',     u:'https://archive.org/download/IndianBackgroundFluteMusicInstrumentalMeditationMusicYogaMusicSpaMusicForRelaxation/Indian%20Background%20Flute%20Music%20Instrumental%20Meditation%20Music%20Yoga%20Music%20Spa%20Music%20for%20Relaxation.mp3' },
    { t:'बाँसुरी — Hatha Yoga',     u:'https://archive.org/download/IndianBackgroundFluteMusicInstrumentalMeditationMusicYogaMusicSpaMusicForRelaxation/Hatha%20Yoga%20Music%20Music%20for%20yoga%20poses%2C%20bansuri%20flute%20music%2C%20soft%20music%2C%20indian%20instrumental%20music.mp3' },
    { t:'राग बागेश्री',             u:'https://archive.org/download/ragabageshriinstrumentalmusicflutesitartabla/Raga%20Bageshri%20instrumental%20music%2C%20Flute%2Csitar%2Ctabla.mp3' },
    { t:'राग कीरवाणी',              u:'https://archive.org/download/MusicForMeditationRagaKeeravaniIndianBansuriFluteIndianMusic/Music%20For%20Meditation%20Raga%20Keeravani%20Indian%20Bansuri%20Flute%20Indian%20Music.mp3' }
  ],
  chinese: [
    { t:'Three Variations of Plum Blossoms', u:'https://ia601300.us.archive.org/32/items/FamousAncientChineseTunes/01-3VariationsOfPlumBlossoms.mp3' },
    { t:'The Han Palace Autumn Moon',        u:'https://ia801300.us.archive.org/32/items/FamousAncientChineseTunes/03-TheHanPalaceAutumnMoon.mp3' },
    { t:"Shepherd's Flute",                  u:'https://ia801300.us.archive.org/32/items/FamousAncientChineseTunes/04-ShepherdsFlute.mp3' },
    { t:'Mountain Stream',                   u:'https://ia601300.us.archive.org/32/items/FamousAncientChineseTunes/07-MountainStream.mp3' },
    { t:'Wild Geese on the Sandbank',        u:'https://ia801300.us.archive.org/32/items/FamousAncientChineseTunes/08-WildGeeseDescendingOnTheSandbank.mp3' },
    { t:'Woodcutter & Fisherman',            u:'https://ia801300.us.archive.org/32/items/FamousAncientChineseTunes/10.-DialogueOfTheLumberjackAndFisherman.mp3' },
    { t:'Bamboo Flute & Guzheng',            u:'https://ia801803.us.archive.org/34/items/beautiful-chinese-music-bamboo-flute-guzheng-chinese-instrumental-music-for-learning-sleep/Beautiful%20Chinese%20Music%20Bamboo%20Flute-Guzheng%20Chinese%20Instrumental%20Music%20for%20Learning%20%26%20Sleep.mp3' },
    { t:'Chinese Relaxing Music',            u:'https://ia902909.us.archive.org/2/items/chineserelaxingmusic/Beautiful%20Chinese%20Relaxing%20Music.mp3' }
  ]
};

/* Naam colour palettes, one per theme. */
const PALETTE = {
  dark: ['#e65000','#ff6a00','#ff8500','#ff9500','#ffaa33','#ffc107','#ffd54f','#ffe082','#fff3cd','#ffffff','#ff7043'],
  day:  ['#5c0000','#7b0000','#8b0000','#a02020','#b22222','#c62828','#8b2500','#a63200','#6b1a00'],
  night:['#7a3300','#8a3d00','#94480c','#a34a00','#8f4b12','#6d2f00','#9c5a1e']
};
const GLOW = { dark:0.55, day:0.42, night:0.16 };   // text-shadow strength per theme

const LABELS = {
  hi:{ naam:'नाम', sankalp:'संकल्प', target:'माला', roop:'रूप', sound:'संकेत', music:'संगीत',
       speed:'गति', edit:'सुधार', install:'स्थापित', today:'आज', total:'कुल', mala:'माला',
       malaShort:'माला', time:'समय', days:'दिन', totalJap:'कुल जप',
       tabJap:'जप', tabRec:'लेखा', tabSet:'व्यवस्था',
       naamPh:'— नाम चुनें —', musicPh:'— संगीत चुनें —', textPh:'अपना पाठ लिखें…', timerPh:'मिनट',
       auto:'ऑटो', langBtn:'हिं', bell:'घंटी', haptic:'कंपन', wake:'स्क्रीन',
       themeDark:'रात', themeDay:'दिन', themeNight:'भोर',
       touch:'स्पर्श',
       move:'चंचल',
       steady:'स्थिर',
       ripple:'तरंग',
       autoNote:'ऑटो केवल दृष्टि के लिए है — इससे जप नहीं गिना जाता।',
       moveOn:'नाम हर स्पर्श पर हटेगा',
       moveOff:'नाम स्थिर रहेगा',
       installBtn:'होम स्क्रीन पर जोड़ें',
       rsToday:'आज मिटाएँ', rsAll:'सब मिटाएँ', sure:'पक्का?',
       hintEdit:'गिनती सीधे यहाँ बदली जा सकती है।',
       ax1:'30 दिन पहले', ax2:'आज',
       foot:'कोई खाता नहीं, कोई सर्वर नहीं — सारी गिनती इसी उपकरण में रहती है।',
       firstRun:'कहीं भी स्पर्श करें — जप गिना जाएगा',
       malaDone:'{n} माला पूरी', targetDone:'संकल्प पूरा हुआ',
       doneReset:'गिनती शून्य', timeUp:'समय पूरा',
       wakeOn:'स्क्रीन चालू रहेगी', wakeOff:'स्क्रीन सामान्य',
       noWake:'यह ब्राउज़र स्क्रीन चालू नहीं रख सकता',
       insecure:'स्क्रीन चालू रखने के लिए https ज़रूरी है — फ़ाइल से खोलने पर यह काम नहीं करता',
       musicFail:'संगीत नहीं चल सका — दूसरा चुनें', pickMusic:'पहले संगीत चुनें',
       indian:'भारतीय', chinese:'चीनी' },

  en:{ naam:'Naam', sankalp:'Sankalp', target:'malas', roop:'Look', sound:'Cues', music:'Music',
       speed:'Pace', edit:'Correct', install:'Install', today:'Today', total:'Total', mala:'Mala',
       malaShort:'malas', time:'Time', days:'Days', totalJap:'Lifetime',
       tabJap:'Jap', tabRec:'Record', tabSet:'Settings',
       naamPh:'— Select naam —', musicPh:'— Select music —', textPh:'Enter your text…', timerPh:'min',
       auto:'Auto', langBtn:'EN', bell:'Bell', haptic:'Haptic', wake:'Screen',
       themeDark:'Dark', themeDay:'Day', themeNight:'Night',
       touch:'Touch',
       move:'Moving',
       steady:'Steady',
       ripple:'Ripple',
       autoNote:'Auto is only for the eye — it does not count jap.',
       moveOn:'The naam will move on every tap',
       moveOff:'The naam will stay put',
       installBtn:'Add to home screen',
       rsToday:'Clear today', rsAll:'Clear all', sure:'Sure?',
       hintEdit:'Counts can be corrected directly here.',
       ax1:'30 days ago', ax2:'today',
       foot:'No account, no server — every count stays on this device.',
       firstRun:'Tap anywhere — your jap is counted',
       malaDone:'{n} malas complete', targetDone:'Sankalp complete',
       doneReset:'Count cleared', timeUp:'Time complete',
       wakeOn:'Screen will stay on', wakeOff:'Screen back to normal',
       noWake:'This browser cannot keep the screen on',
       insecure:'Keeping the screen on needs https — it cannot work from a local file',
       musicFail:'Track would not play — try another', pickMusic:'Choose music first',
       indian:'Indian', chinese:'Chinese' }
};
