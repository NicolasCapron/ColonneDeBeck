// ── UI rendering & voice input ──

import Store from './store.js';

// ── SVG Icons ──
const MIC_SVG = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>';

function micIcon(size) {
  const span = document.createElement('span');
  span.innerHTML = MIC_SVG;
  span.style.display = 'inline-flex';
  span.style.alignItems = 'center';
  span.style.justifyContent = 'center';
  if (size) {
    span.querySelector('svg').setAttribute('width', size);
    span.querySelector('svg').setAttribute('height', size);
  }
  return span;
}

// ── Speech Recognition ──
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let activeRecField = null;

function initSpeech() {
  if (!SpeechRecognition) return null;
  recognition = new SpeechRecognition();
  recognition.lang = 'fr-FR';
  recognition.continuous = false;
  recognition.interimResults = true;
  return recognition;
}

function startVoice(field, btn) {
  if (!recognition) initSpeech();
  if (!recognition) {
    alert('La reconnaissance vocale n\'est pas disponible sur ce navigateur.');
    return;
  }
  if (activeRecField) {
    recognition.stop();
    return;
  }
  activeRecField = field;
  btn.classList.add('recording');
  const before = field.value;

  recognition.onresult = (e) => {
    let transcript = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      transcript += e.results[i][0].transcript;
    }
    field.value = before + (before ? ' ' : '') + transcript;
  };

  recognition.onend = () => {
    btn.classList.remove('recording');
    activeRecField = null;
  };

  recognition.onerror = () => {
    btn.classList.remove('recording');
    activeRecField = null;
  };

  recognition.start();
}

// ── Helpers ──
function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v);
  }
  for (const c of children) {
    if (typeof c === 'string') e.appendChild(document.createTextNode(c));
    else if (c) e.appendChild(c);
  }
  return e;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit'
  });
}

function setHeader(title, showBack = false) {
  const header = document.getElementById('header');
  header.innerHTML = '';
  if (showBack) {
    const btn = el('button', { className: 'btn-back', onClick: () => navigate('home') }, ['\u2190']);
    header.appendChild(btn);
  }
  header.appendChild(el('h1', {}, [title]));
}

// ── Voice-only capture (returns a promise with the transcript) ──
function voiceCapture() {
  return new Promise((resolve, reject) => {
    if (!recognition) initSpeech();
    if (!recognition) {
      reject(new Error('Reconnaissance vocale non disponible'));
      return;
    }
    recognition.continuous = true;
    recognition.interimResults = true;
    let finalTranscript = '';
    let interimTranscript = '';

    recognition.onresult = (e) => {
      interimTranscript = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalTranscript += e.results[i][0].transcript + ' ';
        } else {
          interimTranscript += e.results[i][0].transcript;
        }
      }
      // Update live preview
      const preview = document.getElementById('voice-live-preview');
      if (preview) {
        preview.textContent = finalTranscript + interimTranscript || 'Ecoute en cours...';
      }
    };

    recognition.onend = () => {
      recognition.continuous = false;
      resolve(finalTranscript.trim());
    };

    recognition.onerror = (e) => {
      recognition.continuous = false;
      if (e.error === 'no-speech') resolve(finalTranscript.trim());
      else reject(e);
    };

    recognition.start();
  });
}

// ── Navigation ──
let currentView = 'home';

function navigate(view, data) {
  currentView = view;
  const app = document.getElementById('app');
  app.innerHTML = '';
  // Remove any floating buttons
  document.querySelectorAll('.fab, .fab-mic').forEach((f) => f.remove());
  switch (view) {
    case 'home': renderHome(app); break;
    case 'form': renderForm(app, data); break;
    case 'voiceflow': renderVoiceFlow(app); break;
    case 'detail': renderDetail(app, data); break;
  }
}

// ── EMOTION SUGGESTIONS ──
const EMOTION_SUGGESTIONS = [
  'Tristesse', 'Anxiete', 'Colere', 'Agacement', 'Frustration',
  'Angoisse', 'Decouragement', 'Gene', 'Peur', 'Honte',
  'Deception', 'Culpabilite', 'Solitude', 'Jalousie'
];

const SENSATION_SUGGESTIONS = [
  'Palpitations', 'Boule dans la gorge', 'Vertiges',
  'Fourmillements', 'Serrement poitrine', 'Nausee',
  'Tension musculaire', 'Maux de tete', 'Transpiration'
];

// ── HOME ──
async function renderHome(app) {
  setHeader('Colonnes de Beck');
  const entries = await Store.getAll();

  if (entries.length === 0) {
    app.appendChild(el('div', { className: 'empty-state' }, [
      el('div', { className: 'icon' }, ['\uD83D\uDDD2\uFE0F']),
      el('p', {}, ['Aucune entree pour le moment.']),
      el('p', {}, ['Appuie sur + pour commencer.'])
    ]));
  } else {
    for (const entry of entries) {
      const card = el('div', { className: 'card entry-card', onClick: () => navigate('detail', entry.id) }, [
        el('div', { className: 'entry-date' }, [formatDate(entry.date)]),
        el('div', { className: 'entry-situation' }, [entry.situation || '(pas de description)']),
        el('div', { className: 'entry-emotions' },
          (entry.emotions || []).map((em) =>
            el('span', { className: 'entry-emotion-tag' }, [`${em.name} ${em.intensity}/10`])
          )
        )
      ]);
      app.appendChild(card);
    }
  }

  // FABs
  const fabMic = el('button', { className: 'fab fab-mic', onClick: () => navigate('voiceflow') }, [micIcon(28)]);
  const fab = el('button', { className: 'fab', onClick: () => navigate('form') }, ['+']);
  document.body.appendChild(fabMic);
  document.body.appendChild(fab);
}

// ── FORM (3 steps) ──
function renderForm(app, editId) {
  setHeader('Nouvelle entree', true);

  let step = 0;
  const data = {
    date: new Date().toISOString().slice(0, 16),
    lieu: '',
    avecQui: '',
    situation: '',
    emotions: [],
    pensees: []
  };

  // If editing, load existing
  const init = editId
    ? Store.get(editId).then((e) => { Object.assign(data, e); render(); })
    : Promise.resolve();

  init.then(() => render());

  function render() {
    app.innerHTML = '';

    // Steps indicator
    const dots = el('div', { className: 'steps' }, [0, 1, 2].map((i) =>
      el('div', { className: `step-dot ${i === step ? 'active' : i < step ? 'done' : ''}` })
    ));
    app.appendChild(dots);

    const card = el('div', { className: 'card' });
    app.appendChild(card);

    if (step === 0) renderStep0(card);
    else if (step === 1) renderStep1(card);
    else renderStep2(card);

    // Navigation
    const nav = el('div', { className: 'form-nav' });
    if (step > 0) {
      nav.appendChild(el('button', { className: 'btn btn-outline', onClick: () => { step--; render(); } }, ['Retour']));
    }
    if (step < 2) {
      nav.appendChild(el('button', { className: 'btn btn-primary', onClick: () => { step++; render(); } }, ['Suivant']));
    } else {
      nav.appendChild(el('button', { className: 'btn btn-accent', onClick: saveEntry }, ['Enregistrer']));
    }
    app.appendChild(nav);
  }

  // ── Step 0: Situation ──
  function renderStep0(card) {
    card.appendChild(el('div', { className: 'step-title' }, ['Situation']));
    card.appendChild(el('div', { className: 'step-subtitle' }, ['Que s\'est-il passe ?']));

    // Date
    card.appendChild(el('label', {}, ['Date et heure']));
    const dateInput = el('input', { type: 'datetime-local', value: data.date });
    dateInput.addEventListener('input', () => { data.date = dateInput.value; });
    card.appendChild(dateInput);

    // Lieu
    card.appendChild(el('label', {}, ['Lieu']));
    const lieuWrap = el('div', { className: 'voice-input' });
    const lieuInput = el('input', { type: 'text', placeholder: 'Au bureau, dans la rue...', value: data.lieu });
    lieuInput.addEventListener('input', () => { data.lieu = lieuInput.value; });
    const lieuMic = el('button', { className: 'btn-mic', type: 'button', onClick: () => startVoice(lieuInput, lieuMic) }, [micIcon()]);
    lieuWrap.appendChild(lieuInput);
    lieuWrap.appendChild(lieuMic);
    card.appendChild(lieuWrap);

    // Avec qui
    card.appendChild(el('label', {}, ['Avec qui ?']));
    const quiInput = el('input', { type: 'text', placeholder: 'Seul, avec un collegue...', value: data.avecQui });
    quiInput.addEventListener('input', () => { data.avecQui = quiInput.value; });
    card.appendChild(quiInput);

    // Description
    card.appendChild(el('label', {}, ['Description de la situation']));
    const descWrap = el('div', { className: 'voice-input' });
    const descInput = el('textarea', { placeholder: 'Decrivez ce qui s\'est passe...', rows: '4' }, [data.situation]);
    descInput.addEventListener('input', () => { data.situation = descInput.value; });
    const descMic = el('button', { className: 'btn-mic', type: 'button', onClick: () => startVoice(descInput, descMic) }, [micIcon()]);
    descWrap.appendChild(descInput);
    descWrap.appendChild(descMic);
    card.appendChild(descWrap);
  }

  // ── Step 1: Emotions ──
  function renderStep1(card) {
    card.appendChild(el('div', { className: 'step-title' }, ['Emotions & Sensations']));
    card.appendChild(el('div', { className: 'step-subtitle' }, ['Comment vous sentez-vous ?']));

    // Suggestions
    card.appendChild(el('label', {}, ['Emotions']));
    const chips = el('div', { className: 'chips' });
    for (const name of EMOTION_SUGGESTIONS) {
      const exists = data.emotions.some((e) => e.name === name);
      const chip = el('span', {
        className: `chip ${exists ? 'selected' : ''}`,
        onClick: () => {
          if (exists) {
            data.emotions = data.emotions.filter((e) => e.name !== name);
          } else {
            data.emotions.push({ name, intensity: 5 });
          }
          render();
        }
      }, [name]);
      chips.appendChild(chip);
    }
    card.appendChild(chips);

    card.appendChild(el('label', {}, ['Sensations physiques']));
    const sChips = el('div', { className: 'chips' });
    for (const name of SENSATION_SUGGESTIONS) {
      const exists = data.emotions.some((e) => e.name === name);
      const chip = el('span', {
        className: `chip ${exists ? 'selected' : ''}`,
        onClick: () => {
          if (exists) {
            data.emotions = data.emotions.filter((e) => e.name !== name);
          } else {
            data.emotions.push({ name, intensity: 5 });
          }
          render();
        }
      }, [name]);
      sChips.appendChild(chip);
    }
    card.appendChild(sChips);

    // Custom add
    card.appendChild(el('label', {}, ['Ajouter une autre']));
    const customWrap = el('div', { style: 'display:flex;gap:8px' });
    const customInput = el('input', { type: 'text', placeholder: 'Autre emotion...' });
    const addBtn = el('button', {
      className: 'btn btn-primary btn-small',
      onClick: () => {
        const v = customInput.value.trim();
        if (v && !data.emotions.some((e) => e.name === v)) {
          data.emotions.push({ name: v, intensity: 5 });
          render();
        }
      }
    }, ['+']);
    customWrap.appendChild(customInput);
    customWrap.appendChild(addBtn);
    card.appendChild(customWrap);

    // Intensity sliders for selected emotions
    if (data.emotions.length > 0) {
      card.appendChild(el('label', { style: 'margin-top:20px' }, ['Intensite']));
      for (const em of data.emotions) {
        const item = el('div', { className: 'emotion-item' });
        item.appendChild(el('span', { className: 'name' }, [em.name]));

        const valSpan = el('span', { className: 'slider-value' }, [`${em.intensity}/10`]);
        const slider = el('input', { type: 'range', min: '0', max: '10', value: String(em.intensity) });
        slider.addEventListener('input', () => {
          em.intensity = parseInt(slider.value);
          valSpan.textContent = `${em.intensity}/10`;
        });

        const group = el('div', { className: 'slider-group' });
        group.appendChild(slider);
        group.appendChild(valSpan);
        item.appendChild(group);

        const removeBtn = el('button', { className: 'btn-remove', onClick: () => {
          data.emotions = data.emotions.filter((e) => e !== em);
          render();
        }}, ['\u00D7']);
        item.appendChild(removeBtn);

        card.appendChild(item);
      }
    }
  }

  // ── Step 2: Pensees automatiques ──
  function renderStep2(card) {
    card.appendChild(el('div', { className: 'step-title' }, ['Pensees automatiques']));
    card.appendChild(el('div', { className: 'step-subtitle' }, ['Que vous etes-vous dit ?']));

    // Input for new thought
    card.appendChild(el('label', {}, ['Ajouter une pensee']));
    const wrap = el('div', { className: 'voice-input' });
    const input = el('textarea', { placeholder: '\"Je ne vais jamais y arriver...\"', rows: '2' });
    const mic = el('button', { className: 'btn-mic', type: 'button', onClick: () => startVoice(input, mic) }, [micIcon()]);
    wrap.appendChild(input);
    wrap.appendChild(mic);
    card.appendChild(wrap);

    const addBtn = el('button', {
      className: 'btn btn-primary btn-small',
      style: 'margin-top:8px',
      onClick: () => {
        const v = input.value.trim();
        if (v) {
          data.pensees.push(v);
          render();
        }
      }
    }, ['+ Ajouter']);
    card.appendChild(addBtn);

    // List
    if (data.pensees.length > 0) {
      card.appendChild(el('label', { style: 'margin-top:16px' }, ['Vos pensees']));
      for (let i = 0; i < data.pensees.length; i++) {
        const item = el('div', { className: 'thought-item' });
        item.appendChild(el('span', { className: 'text' }, [`\u00AB ${data.pensees[i]} \u00BB`]));
        const removeBtn = el('button', {
          className: 'btn-remove',
          onClick: () => { data.pensees.splice(i, 1); render(); }
        }, ['\u00D7']);
        item.appendChild(removeBtn);
        card.appendChild(item);
      }
    }
  }

  async function saveEntry() {
    await Store.save(data);
    navigate('home');
  }
}

// ── VOICE FLOW (guided 3-step voice capture) ──
function renderVoiceFlow(app) {
  setHeader('Saisie vocale', true);

  const STEPS = [
    { key: 'situation', title: 'Situation', subtitle: 'Decrivez ce qui s\'est passe, ou, quand, avec qui...',  icon: '\uD83D\uDCCD' },
    { key: 'emotions',  title: 'Emotions',  subtitle: 'Que ressentez-vous ? Nommez vos emotions et sensations...', icon: '\uD83D\uDCA7' },
    { key: 'pensees',   title: 'Pensees',   subtitle: 'Que vous etes-vous dit ? Quelles pensees automatiques...', icon: '\uD83D\uDCAD' }
  ];

  let stepIndex = 0;
  const transcripts = { situation: '', emotions: '', pensees: '' };

  function render() {
    app.innerHTML = '';
    const step = STEPS[stepIndex];

    // Steps indicator
    const dots = el('div', { className: 'steps' }, STEPS.map((_, i) =>
      el('div', { className: `step-dot ${i === stepIndex ? 'active' : i < stepIndex ? 'done' : ''}` })
    ));
    app.appendChild(dots);

    const card = el('div', { className: 'card voice-flow-card' });

    card.appendChild(el('div', { className: 'voice-flow-icon' }, [step.icon]));
    card.appendChild(el('div', { className: 'step-title' }, [step.title]));
    card.appendChild(el('div', { className: 'step-subtitle' }, [step.subtitle]));

    // Live preview area
    const preview = el('div', { className: 'voice-preview', id: 'voice-live-preview' },
      [transcripts[step.key] || 'Appuyez sur le micro pour parler...']
    );
    card.appendChild(preview);

    // Big mic button
    let isRecording = false;
    const micBtn = el('button', { className: 'voice-flow-mic' }, [micIcon(36)]);
    micBtn.addEventListener('click', async () => {
      if (isRecording) {
        recognition.stop();
        return;
      }
      isRecording = true;
      micBtn.classList.add('recording');
      preview.textContent = 'Ecoute en cours...';
      try {
        const text = await voiceCapture();
        transcripts[step.key] = text;
        preview.textContent = text || '(rien detecte, reessayez)';
      } catch {
        preview.textContent = '(erreur, reessayez)';
      }
      isRecording = false;
      micBtn.classList.remove('recording');
    });
    card.appendChild(micBtn);
    card.appendChild(el('div', { className: 'voice-flow-hint' }, ['Appuyez pour parler, appuyez pour arreter']));

    app.appendChild(card);

    // Navigation
    const nav = el('div', { className: 'form-nav' });
    if (stepIndex > 0) {
      nav.appendChild(el('button', { className: 'btn btn-outline', onClick: () => { stepIndex--; render(); } }, ['Retour']));
    }
    if (stepIndex < STEPS.length - 1) {
      nav.appendChild(el('button', { className: 'btn btn-primary', onClick: () => { stepIndex++; render(); } }, ['Suivant']));
    } else {
      nav.appendChild(el('button', { className: 'btn btn-accent', onClick: saveVoiceEntry }, ['Enregistrer']));
    }
    app.appendChild(nav);
  }

  async function saveVoiceEntry() {
    const entry = {
      date: new Date().toISOString().slice(0, 16),
      lieu: '',
      avecQui: '',
      situation: transcripts.situation,
      emotions: transcripts.emotions
        ? transcripts.emotions.split(/[,.]/).map((s) => s.trim()).filter(Boolean).map((name) => ({ name, intensity: 5 }))
        : [],
      pensees: transcripts.pensees
        ? transcripts.pensees.split(/[,.]/).map((s) => s.trim()).filter(Boolean)
        : []
    };
    await Store.save(entry);
    navigate('form', entry.id);
  }

  render();
}

// ── DETAIL VIEW ──
async function renderDetail(app, id) {
  setHeader('Detail', true);
  const entry = await Store.get(id);
  if (!entry) { navigate('home'); return; }

  const card = el('div', { className: 'card' });

  // Date
  card.appendChild(el('div', { className: 'entry-date' }, [formatDate(entry.date)]));

  // Situation
  const s1 = el('div', { className: 'detail-section' });
  s1.appendChild(el('h3', {}, ['Situation']));
  if (entry.lieu) s1.appendChild(el('p', {}, [`Lieu : ${entry.lieu}`]));
  if (entry.avecQui) s1.appendChild(el('p', {}, [`Avec : ${entry.avecQui}`]));
  s1.appendChild(el('p', {}, [entry.situation || '(non renseigne)']));
  card.appendChild(s1);

  // Emotions
  const s2 = el('div', { className: 'detail-section' });
  s2.appendChild(el('h3', {}, ['Emotions & Sensations']));
  const ul = el('ul');
  for (const em of (entry.emotions || [])) {
    ul.appendChild(el('li', {}, [`${em.name} — ${em.intensity}/10`]));
  }
  s2.appendChild(ul);
  card.appendChild(s2);

  // Pensees
  const s3 = el('div', { className: 'detail-section' });
  s3.appendChild(el('h3', {}, ['Pensees automatiques']));
  const ul2 = el('ul');
  for (const p of (entry.pensees || [])) {
    ul2.appendChild(el('li', {}, [`\u00AB ${p} \u00BB`]));
  }
  s3.appendChild(ul2);
  card.appendChild(s3);

  app.appendChild(card);

  // Actions
  const actions = el('div', { className: 'detail-actions' });
  actions.appendChild(el('button', { className: 'btn btn-outline', onClick: () => navigate('form', entry.id) }, ['Modifier']));
  actions.appendChild(el('button', { className: 'btn btn-danger', onClick: async () => {
    if (confirm('Supprimer cette entree ?')) {
      await Store.remove(entry.id);
      navigate('home');
    }
  }}, ['Supprimer']));
  app.appendChild(actions);
}

export { navigate };
