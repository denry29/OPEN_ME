/* =====================================================================
   APP.JS — everything except the 3D cake (that's in cake3d.js)
   ===================================================================== */


/* ---------------------------------------------------------------------
   STEP FLOW
   (the circular progress dots have been removed — steps are now
   tracked purely internally, with no dot indicator in the UI)
   --------------------------------------------------------------------- */

const StepFlow = (() => {

  const ORDER = [
    'welcome',
    'memories',
    'letter',
    'cakes',
    'celebration',
    'final'
  ];

  let current = 0;
  let celebrationStarted = false;

  const stepEls = {};

  ORDER.forEach(name => {
    stepEls[name] = document.querySelector(
      `.step[data-step="${name}"]`
    );
  });


  function show(index) {

    ORDER.forEach((name, i) => {

      if (stepEls[name]) {
        stepEls[name].classList.toggle(
          'active-step',
          i === index
        );
      }

    });

    current = index;


    if (
      ORDER[index] === 'letter' &&
      window.CakeChoiceBanner
    ) {
      window.CakeChoiceBanner.refresh();
    }


    if (
      ORDER[index] === 'celebration' &&
      window.CakeCelebration3D
    ) {

      if (!celebrationStarted) {

        window.CakeCelebration3D.start();

        celebrationStarted = true;

      } else {

        window.CakeCelebration3D.reset();

      }
    }

  }


  function goTo(name) {

    const index = ORDER.indexOf(name);

    if (index !== -1) {
      show(index);
    }

  }


  function next() {

    if (current < ORDER.length - 1) {

      show(current + 1);

      // Confetti every time Continue is pressed
      birthdayConfetti();

    }

  }


  function back() {

    if (current > 0) {
      show(current - 1);
    }

  }


  function init() {

    show(0);

    document
      .querySelectorAll('[data-next]')
      .forEach(button => {
        button.addEventListener('click', next);
      });


    document
      .querySelectorAll('[data-back]')
      .forEach(button => {
        button.addEventListener('click', back);
      });

  }


  return {
    init,
    goTo,
    next,
    back
  };

})();


/* ---------------------------------------------------------------------
   CONFETTI — canvas-confetti library
   --------------------------------------------------------------------- */

function birthdayConfetti() {

  if (typeof window.confetti !== 'function') {

    console.error(
      'canvas-confetti is not loaded.'
    );

    return;
  }


  console.log('CONFETTI FIRED!');


  // Big center explosion
  window.confetti({

    particleCount: 250,

    spread: 120,

    startVelocity: 45,

    origin: {
      x: 0.5,
      y: 0.65
    }

  });


  // Left cannon
  setTimeout(() => {

    window.confetti({

      particleCount: 120,

      angle: 60,

      spread: 70,

      startVelocity: 45,

      origin: {
        x: 0,
        y: 0.7
      }

    });

  }, 300);


  // Right cannon
  setTimeout(() => {

    window.confetti({

      particleCount: 120,

      angle: 120,

      spread: 70,

      startVelocity: 45,

      origin: {
        x: 1,
        y: 0.7
      }

    });

  }, 600);

}



/* ---------------------------------------------------------------------
   PARTICLES
   Only sparkles + custom confetti.
   NO floating hearts.
   NO ambient hearts.
   --------------------------------------------------------------------- */

const Particles = (() => {

  const layer =
    document.getElementById('particle-layer');

  const reduceMotion =
    window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;


  function spawn(element, lifetimeMs) {

    if (!layer) {

      console.warn(
        '#particle-layer was not found.'
      );

      return;
    }


    layer.appendChild(element);


    setTimeout(() => {
      element.remove();
    }, lifetimeMs);

  }



  /* =========================
     SPARKLES
     ========================= */

  function sparkles(
    count = 6,
    originXvw = null,
    originYvh = null
  ) {

    if (reduceMotion) {
      return;
    }


    for (let i = 0; i < count; i++) {

      const sparkle =
        document.createElement('div');


      sparkle.className = 'floaty';

      sparkle.textContent = '✨';


      const x =
        originXvw !== null
          ? originXvw +
            (Math.random() - 0.5) * 12
          : Math.random() * 100;


      const y =
        originYvh !== null
          ? originYvh +
            (Math.random() - 0.5) * 12
          : Math.random() * 100;


      sparkle.style.left =
        `${x}vw`;

      sparkle.style.top =
        `${y}vh`;


      sparkle.style.fontSize =
        `${10 + Math.random() * 14}px`;


      sparkle.style.animation =
        `sparkle-pop ${
          0.8 + Math.random() * 0.6
        }s ease-out forwards`;


      spawn(
        sparkle,
        1600
      );

    }

  }



  /* =========================
     CUSTOM CONFETTI
     ========================= */

  function confettiBurst(
    count = 40
  ) {

    if (reduceMotion) {
      return;
    }


    const colors = [
      '#E50914',
      '#FF6B81',
      '#FFFFFF',
      '#A00018'
    ];


    for (let i = 0; i < count; i++) {

      const piece =
        document.createElement('div');


      piece.className = 'floaty';


      const size =
        6 + Math.random() * 6;


      piece.style.width =
        `${size}px`;


      piece.style.height =
        `${size * 0.4}px`;


      piece.style.background =
        colors[
          Math.floor(
            Math.random() * colors.length
          )
        ];


      piece.style.left =
        `${Math.random() * 100}vw`;


      piece.style.top =
        '-5vh';


      piece.style.borderRadius =
        '2px';


      const duration =
        2.4 + Math.random() * 1.6;


      piece.style.animation =
        `confetti-fall ${duration}s ease-in forwards`;


      spawn(
        piece,
        duration * 1000 + 200
      );

    }

  }


  return {
    sparkles,
    confettiBurst
  };

})();


/* Make Particles available to cake3d.js */
window.Particles = Particles;



/* ---------------------------------------------------------------------
   CRYPTO UTILS
   --------------------------------------------------------------------- */

const CryptoUtils = (() => {

  function bufToBase64Url(buf) {

    const bytes =
      new Uint8Array(buf);

    let str = '';


    for (const byte of bytes) {
      str += String.fromCharCode(byte);
    }


    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

  }


  function base64UrlToBuf(b64url) {

    let b64 =
      b64url
        .replace(/-/g, '+')
        .replace(/_/g, '/');


    while (b64.length % 4) {
      b64 += '=';
    }


    const str = atob(b64);


    const bytes =
      new Uint8Array(str.length);


    for (
      let i = 0;
      i < str.length;
      i++
    ) {
      bytes[i] =
        str.charCodeAt(i);
    }


    return bytes.buffer;

  }


  async function generateKey() {

    return crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      [
        'encrypt',
        'decrypt'
      ]
    );

  }


  async function exportKeyToString(key) {

    const raw =
      await crypto.subtle.exportKey(
        'raw',
        key
      );


    return bufToBase64Url(raw);

  }


  async function importKeyFromString(keyStr) {

    const raw =
      base64UrlToBuf(keyStr);


    return crypto.subtle.importKey(
      'raw',
      raw,
      {
        name: 'AES-GCM'
      },
      true,
      [
        'encrypt',
        'decrypt'
      ]
    );

  }


  async function encryptText(
    plaintext,
    key
  ) {

    const iv =
      crypto.getRandomValues(
        new Uint8Array(12)
      );


    const encoded =
      new TextEncoder().encode(
        plaintext
      );


    const ciphertext =
      await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv
        },
        key,
        encoded
      );


    return {

      ciphertext:
        bufToBase64Url(
          ciphertext
        ),

      iv:
        bufToBase64Url(
          iv.buffer
        )

    };

  }


  async function decryptText(
    ciphertextB64,
    ivB64,
    key
  ) {

    const ciphertext =
      base64UrlToBuf(
        ciphertextB64
      );


    const iv =
      base64UrlToBuf(
        ivB64
      );


    const decrypted =
      await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: new Uint8Array(iv)
        },
        key,
        ciphertext
      );


    return new TextDecoder()
      .decode(decrypted);

  }


  return {
    generateKey,
    exportKeyToString,
    importKeyFromString,
    encryptText,
    decryptText
  };

})();



/* ---------------------------------------------------------------------
   HASH STORE
   --------------------------------------------------------------------- */

const HashStore = (() => {

  function readParams() {

    const raw =
      window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash;


    return new URLSearchParams(raw);

  }


  function get(key) {

    return readParams().get(key);

  }


  function set(key, value) {

    const params =
      readParams();


    params.set(
      key,
      value
    );


    window.location.hash =
      params.toString();

  }


  return {
    get,
    set
  };

})();



/* ---------------------------------------------------------------------
   LETTER STORE
   --------------------------------------------------------------------- */

const LetterStore = (() => {

  function save(
    ciphertext,
    iv
  ) {

    // Store encrypted letter in the URL.
    // PIN is never stored in the URL.

    HashStore.set(
      'letter',
      `${iv}.${ciphertext}`
    );


    return true;

  }


  function load() {

    const payload =
      HashStore.get('letter');


    if (!payload) {
      return null;
    }


    const parts =
      payload.split('.');


    if (parts.length !== 2) {
      return null;
    }


    const [
      iv,
      ciphertext
    ] = parts;


    if (!iv || !ciphertext) {
      return null;
    }


    return {
      iv,
      ciphertext
    };

  }


  return {
    save,
    load
  };

})();



/* ---------------------------------------------------------------------
   CAKE CHOICE STORE
   --------------------------------------------------------------------- */

const CakeChoiceStore = (() => {

  function save(cakeName) {

    HashStore.set(
      'cake',
      cakeName
    );


    return true;

  }


  function load() {

    return HashStore.get('cake');

  }


  return {
    save,
    load
  };

})();



/* ---------------------------------------------------------------------
   CAKE CHOICE BANNER
   --------------------------------------------------------------------- */

const CakeChoiceBanner = (() => {

  const banner =
    document.getElementById(
      'cake-choice-banner'
    );


  const nameEl =
    document.getElementById(
      'cake-choice-name'
    );


  function refresh() {

    if (!banner || !nameEl) {
      return;
    }


    const cakeName =
      CakeChoiceStore.load();


    if (cakeName) {

      nameEl.textContent =
        cakeName;

      banner.hidden = false;

    } else {

      banner.hidden = true;

    }

  }


  return {
    refresh
  };

})();


window.CakeChoiceBanner =
  CakeChoiceBanner;



/* ---------------------------------------------------------------------
   LETTER
   --------------------------------------------------------------------- */

const Letter = (() => {

  const writerMode =
    document.getElementById(
      'writer-mode'
    );


  const pinCreated =
    document.getElementById(
      'pin-created'
    );


  const pinEntry =
    document.getElementById(
      'pin-entry'
    );


  const celebrantLetter =
    document.getElementById(
      'celebrant-letter'
    );


  const letterContinueBtn =
    document.getElementById(
      'letter-continue-btn'
    );


  const textarea =
    document.getElementById(
      'letter-textarea'
    );


  const finishBtn =
    document.getElementById(
      'finish-letter-btn'
    );


  const letterPin =
    document.getElementById(
      'letter-pin'
    );


  const pinInput =
    document.getElementById(
      'letter-pin-input'
    );


  const openLetterBtn =
    document.getElementById(
      'open-letter-btn'
    );


  const pinError =
    document.getElementById(
      'pin-error'
    );


  const celebrantLetterText =
    document.getElementById(
      'celebrant-letter-text'
    );



  function hideAllPanels() {

    [
      writerMode,
      pinCreated,
      pinEntry,
      celebrantLetter
    ].forEach(element => {

      if (element) {
        element.hidden = true;
      }

    });


    if (letterContinueBtn) {
      letterContinueBtn.hidden = true;
    }

  }



  // Generate a random 6-digit PIN
  function generatePIN() {

    const array =
      new Uint32Array(1);


    crypto.getRandomValues(
      array
    );


    return String(
      array[0] % 1000000
    ).padStart(
      6,
      '0'
    );

  }



  // Turn PIN into AES-256 encryption key
  async function createKeyFromPIN(pin) {

    const encoded =
      new TextEncoder().encode(
        pin
      );


    const hash =
      await crypto.subtle.digest(
        'SHA-256',
        encoded
      );


    return crypto.subtle.importKey(
      'raw',
      hash,
      {
        name: 'AES-GCM'
      },
      false,
      [
        'encrypt',
        'decrypt'
      ]
    );

  }



  function init() {

    hideAllPanels();

    CakeChoiceBanner.refresh();


    const existingLetter =
      LetterStore.load();


    if (existingLetter) {

      // Letter already exists
      pinEntry.hidden = false;

    } else {

      // No letter yet
      writerMode.hidden = false;

    }

  }



  async function sealLetter() {

    const message =
      textarea.value.trim();


    if (!message) {

      alert(
        'Please write the letter first.'
      );

      return;

    }


    finishBtn.disabled = true;


    try {

      const pin =
        generatePIN();


      const key =
        await createKeyFromPIN(
          pin
        );


      const {
        ciphertext,
        iv
      } =
        await CryptoUtils.encryptText(
          message,
          key
        );


      LetterStore.save(
        ciphertext,
        iv
      );


      textarea.value = '';


      letterPin.textContent =
        pin;


      hideAllPanels();


      pinCreated.hidden =
        false;


      Particles.sparkles(
        10,
        50,
        40
      );


      console.log(
        'LETTER SEALED'
      );


      console.log(
        'PIN:',
        pin
      );


    } catch (error) {

      console.error(
        'LETTER SAVE ERROR:',
        error
      );


      alert(
        'The letter could not be sealed. Please try again.'
      );

    }


    finishBtn.disabled = false;

  }



  async function openLetter() {

    const pin =
      pinInput.value.trim();


    if (!/^\d{6}$/.test(pin)) {

      pinError.textContent =
        'Please enter the 6-digit PIN.';

      pinError.hidden = false;

      return;
    }


    openLetterBtn.disabled = true;

    pinError.hidden = true;


    try {

      const existingLetter =
        LetterStore.load();


      if (!existingLetter) {

        throw new Error(
          'No letter found.'
        );

      }


      const key =
        await createKeyFromPIN(
          pin
        );


      const plaintext =
        await CryptoUtils.decryptText(
          existingLetter.ciphertext,
          existingLetter.iv,
          key
        );


      celebrantLetterText.textContent =
        plaintext;


      hideAllPanels();


      celebrantLetter.hidden =
        false;


      if (letterContinueBtn) {
        letterContinueBtn.hidden = false;
      }


      Particles.sparkles(
        14,
        45,
        45
      );


      // Confetti when letter is opened
      Particles.confettiBurst(
        80
      );


    } catch (error) {

      console.error(
        'LETTER OPEN ERROR:',
        error
      );


      pinError.textContent =
        'Incorrect PIN. Please try again.';


      pinError.hidden = false;


      pinInput.value = '';


      pinInput.focus();

    }


    openLetterBtn.disabled =
      false;

  }



  function bindEvents() {

    if (finishBtn) {

      finishBtn.addEventListener(
        'click',
        sealLetter
      );

    }


    if (openLetterBtn) {

      openLetterBtn.addEventListener(
        'click',
        openLetter
      );

    }


    if (pinInput) {

      pinInput.addEventListener(
        'keydown',
        event => {

          if (event.key === 'Enter') {
            openLetter();
          }

        }
      );


      // Only allow numbers
      pinInput.addEventListener(
        'input',
        () => {

          pinInput.value =
            pinInput.value
              .replace(/\D/g, '')
              .slice(0, 6);

        }
      );

    }

  }


  return {
    init,
    bindEvents
  };

})();



/* ---------------------------------------------------------------------
   CAKE SECTION
   --------------------------------------------------------------------- */

const CakeSection = (() => {

  const grid =
    document.getElementById(
      'cake-grid'
    );


  const chosenCakeNameEl =
    document.getElementById(
      'chosen-cake-name-3d'
    );


  const confirmModal =
    document.getElementById(
      'cake-confirm-modal'
    );


  const confirmYesBtn =
    document.getElementById(
      'cake-confirm-yes'
    );


  const confirmNoBtn =
    document.getElementById(
      'cake-confirm-no'
    );


  let pendingCake = null;



  function getCakes() {

    if (
      typeof CAKES === 'undefined' ||
      !Array.isArray(CAKES)
    ) {

      console.error(
        '[CakeSection] CAKES array not found.'
      );

      return [];

    }


    return CAKES;

  }



  function renderGrid() {

    if (!grid) {
      return;
    }


    grid.innerHTML = '';


    getCakes().forEach(cake => {

      const card =
        document.createElement(
          'button'
        );


      card.type = 'button';

      card.className =
        'cake-card';


      card.setAttribute(
        'aria-label',
        'Choose this cake'
      );


      const photoDiv =
        document.createElement(
          'div'
        );


      photoDiv.className =
        'cake-card-photo';


      const img =
        document.createElement(
          'img'
        );


      img.src =
        cake.previewImage;


      img.alt =
        cake.name;


      img.loading =
        'lazy';


      img.onerror = () => {

        photoDiv.style.display =
          'none';

      };


      photoDiv.appendChild(
        img
      );


      card.appendChild(
        photoDiv
      );


      card.addEventListener(
        'click',
        () => askConfirm(cake)
      );


      grid.appendChild(
        card
      );

    });

  }



  function askConfirm(cake) {

    pendingCake =
      cake;


    if (confirmModal) {
      confirmModal.hidden =
        false;
    }

  }



  function closeConfirm() {

    pendingCake =
      null;


    if (confirmModal) {
      confirmModal.hidden =
        true;
    }

  }



  function confirmCake() {

    if (!pendingCake) {
      return;
    }


    const cake =
      pendingCake;


    if (confirmModal) {
      confirmModal.hidden =
        true;
    }


    pendingCake =
      null;


    selectCake(cake);

  }



  function selectCake(cake) {

    if (chosenCakeNameEl) {

      chosenCakeNameEl.textContent =
        cake.name;

    }


    // Remember cake choice in URL
    CakeChoiceStore.save(
      cake.name
    );


    CakeChoiceBanner.refresh();


    if (window.CakeCelebration3D) {

      window.CakeCelebration3D.start();

      window.CakeCelebration3D.loadCake(
        cake
      );

    } else {

      console.error(
        '[CakeSection] CakeCelebration3D is not loaded.'
      );

    }


    Particles.sparkles(
      8,
      50,
      50
    );


    StepFlow.goTo(
      'celebration'
    );

  }



  function bindEvents() {

    if (confirmYesBtn) {

      confirmYesBtn.addEventListener(
        'click',
        confirmCake
      );

    }


    if (confirmNoBtn) {

      confirmNoBtn.addEventListener(
        'click',
        closeConfirm
      );

    }

  }



  function init() {

    renderGrid();

    bindEvents();

  }


  return {
    init
  };

})();



/* ---------------------------------------------------------------------
   VINYL MUSIC SYNC
   Spins the vinyl only while bgMusic is actually playing.
   Consolidated into a single module (previously duplicated).
   --------------------------------------------------------------------- */

const MusicVinylSync = (() => {
  let audio = null;
  let vinyl = null;

  function start() {
    if (vinyl) {
      vinyl.classList.add('is-playing');
    }
  }

  function stop() {
    if (vinyl) {
      vinyl.classList.remove('is-playing');
    }
  }

  function init() {
    audio = document.getElementById('bgMusic');
    vinyl = document.querySelector('.music-vinyl');

    if (!audio) {
      console.error('[Dahan Vinyl] #bgMusic not found.');
      return;
    }

    if (!vinyl) {
      console.error('[Dahan Vinyl] .music-vinyl not found.');
      return;
    }

    // Music starts
    audio.addEventListener('play', start);
    audio.addEventListener('playing', start);

    // Music pauses
    audio.addEventListener('pause', stop);

    // Music finishes
    audio.addEventListener('ended', stop);

    // Correct initial state
    if (!audio.paused) {
      start();
    } else {
      stop();
    }
  }

  return {
    init,
    start,
    stop
  };
})();


/* Make it available globally (e.g. to the Okay button handler below,
   which starts the vinyl the instant it's clicked). */
window.MusicVinylSync = MusicVinylSync;



/* ---------------------------------------------------------------------
   MUSIC
   --------------------------------------------------------------------- */

const Music = (() => {

  const audio =
    document.getElementById(
      'bgMusic'
    );


  async function play() {

    if (!audio) {

      console.error(
        '[Music] #bgMusic not found.'
      );

      return;
    }


    try {

      await audio.play();


      console.log(
        '[Music] Music is playing.'
      );


      // Belt-and-suspenders: start the vinyl directly too,
      // in case the 'play' event fires oddly on some browsers.
      MusicVinylSync.start();


    } catch (error) {

      console.error(
        '[Music] Could not play music:',
        error
      );

    }

  }



  function pause() {

    if (!audio) {
      return;
    }


    audio.pause();


    MusicVinylSync.stop();


    console.log(
      '[Music] Music paused.'
    );

  }



  function init() {

    if (!audio) {

      console.error(
        '[Music] #bgMusic not found.'
      );

      return;
    }


    audio.addEventListener(
      'loadeddata',
      () => {

        console.log(
          '[Music] bday.mp3 loaded successfully.'
        );

      }
    );


    audio.addEventListener(
      'error',
      () => {

        console.error(
          '[Music] Audio error:',
          audio.error
        );


        console.error(
          '[Music] Current source:',
          audio.currentSrc
        );

      }
    );


    console.log(
      '[Music] Initialized.'
    );

  }



  return {
    play,
    pause,
    init
  };

})();



/* ---------------------------------------------------------------------
   MUSIC REMINDER
   --------------------------------------------------------------------- */

function initMusicReminder() {

  const reminder =
    document.getElementById(
      'music-reminder'
    );


  const okBtn =
    document.getElementById(
      'music-reminder-ok'
    );


  if (!reminder || !okBtn) {
    return;
  }


  // Show Okay button after 3 seconds
  setTimeout(() => {

    okBtn.hidden =
      false;

  }, 3000);


  // Start music and confetti
  // from a real user click.
  okBtn.addEventListener(
    'click',
    () => {

      reminder.hidden =
        true;


      // Spin the vinyl the instant the button is clicked —
      // don't wait on audio.play()'s promise or its events,
      // which can lag while the mp3 loads.
      MusicVinylSync.start();


      Music.play();


      birthdayConfetti();

    }
  );

}



/* ---------------------------------------------------------------------
   INITIALIZATION
   --------------------------------------------------------------------- */

document.addEventListener(
  'DOMContentLoaded',
  () => {

    const safe = (label, fn) => {

      try {

        fn();

      } catch (error) {

        console.error(
          `[init:${label}] failed:`,
          error
        );

      }

    };


    safe(
      'StepFlow',
      () => StepFlow.init()
    );


    safe(
      'Letter.bindEvents',
      () => Letter.bindEvents()
    );


    safe(
      'Letter.init',
      () => Letter.init()
    );


    safe(
      'CakeSection',
      () => CakeSection.init()
    );


    safe(
      'MusicVinylSync',
      () => MusicVinylSync.init()
    );


    safe(
      'Music',
      () => Music.init()
    );


    safe(
      'open-surprise button',
      () => {

        const openSurpriseBtn =
          document.getElementById(
            'open-surprise'
          );


        if (!openSurpriseBtn) {
          return;
        }


        openSurpriseBtn.addEventListener(
          'click',
          () => {

            // Sparkles only
            Particles.sparkles(
              14,
              50,
              50
            );


            StepFlow.next();

          }
        );

      }
    );


    safe(
      'music reminder',
      () => initMusicReminder()
    );

  }
);

/* =====================================================================
   MUSIC WIDGET — DRAG TO REPOSITION
   ---------------------------------------------------------------------
   Makes the floating "Now Playing" sticker (.music-display) movable
   anywhere on screen, on both touch (phones) and mouse (desktop).
   Uses Pointer Events so one code path handles both input types.

   It does NOT touch playback logic — app.js still owns starting/
   stopping the audio and toggling the .is-playing class on the vinyl.
   This file only repositions the widget's container.
   ===================================================================== */

(function () {
  "use strict";

  function initMusicDrag() {
    var widget = document.querySelector(".music-display");
    if (!widget) return;

    var dragging = false;
    var pointerId = null;
    var offsetX = 0;
    var offsetY = 0;
    var moved = false;

    function clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }

    // Keep the widget fully inside the viewport, with a small margin
    function place(x, y) {
      var rect = widget.getBoundingClientRect();
      var margin = 8;
      var maxX = window.innerWidth - rect.width - margin;
      var maxY = window.innerHeight - rect.height - margin;

      var clampedX = clamp(x, margin, Math.max(maxX, margin));
      var clampedY = clamp(y, margin, Math.max(maxY, margin));

      widget.style.left = clampedX + "px";
      widget.style.top = clampedY + "px";
      widget.style.right = "auto";
      widget.style.bottom = "auto";
    }

    function onPointerDown(e) {
      // Only the primary button/touch starts a drag
      if (e.button !== undefined && e.button !== 0) return;

      dragging = true;
      moved = false;
      pointerId = e.pointerId;

      var rect = widget.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;

      widget.classList.add("is-dragging");

      try {
        widget.setPointerCapture(pointerId);
      } catch (err) {
        /* ignore — not fatal if capture isn't supported */
      }
    }

    function onPointerMove(e) {
      if (!dragging || e.pointerId !== pointerId) return;
      moved = true;
      place(e.clientX - offsetX, e.clientY - offsetY);
    }

    function onPointerUp(e) {
      if (!dragging || e.pointerId !== pointerId) return;
      dragging = false;
      pointerId = null;
      widget.classList.remove("is-dragging");

      try {
        widget.releasePointerCapture(e.pointerId);
      } catch (err) {
        /* ignore */
      }
    }

    widget.addEventListener("pointerdown", onPointerDown);
    widget.addEventListener("pointermove", onPointerMove);
    widget.addEventListener("pointerup", onPointerUp);
    widget.addEventListener("pointercancel", onPointerUp);

    // If the widget was mid-drag or already repositioned and the
    // window/orientation changes size, keep it on-screen.
    window.addEventListener("resize", function () {
      var rect = widget.getBoundingClientRect();
      if (widget.style.left || widget.style.top) {
        place(rect.left, rect.top);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMusicDrag);
  } else {
    initMusicDrag();
  }
})();