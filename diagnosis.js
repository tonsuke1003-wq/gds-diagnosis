(function () {
  'use strict';

  const STORAGE_KEY = 'gds_diagnosis_result';

  // ===== State =====
  let currentIndex = 0;
  const scores = { story: 0, sense: 0, relation: 0, inquiry: 0 };

  // ===== Element refs =====
  const screens = {
    start:     document.getElementById('screen-start'),
    question:  document.getElementById('screen-question'),
    analyzing: document.getElementById('screen-analyzing'),
    result:    document.getElementById('screen-result'),
  };

  const els = {
    progressBar:  document.getElementById('progress-bar'),
    progressText: document.getElementById('progress-text'),
    questionText: document.getElementById('question-text'),
    optionsList:  document.getElementById('options-list'),
    btnStart:     document.getElementById('btn-start'),
    btnRetry:     document.getElementById('btn-retry'),
  };

  // ===== Screen transitions =====
  function showScreen(name) {
    Object.entries(screens).forEach(([key, el]) => {
      el.classList.remove('active', 'visible');
    });
    const target = screens[name];
    target.classList.add('active');
    // Next frame to trigger opacity transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        target.classList.add('visible');
      });
    });
  }

  // ===== Progress =====
  function updateProgress() {
    const pct = (currentIndex / QUESTIONS.length) * 100;
    els.progressBar.style.width = pct + '%';
    els.progressText.textContent = (currentIndex + 1) + ' / ' + QUESTIONS.length;
  }

  // ===== Render question =====
  function renderQuestion() {
    const q = QUESTIONS[currentIndex];
    updateProgress();

    // Fade out content
    els.questionText.style.opacity = '0';
    els.optionsList.style.opacity = '0';

    setTimeout(() => {
      els.questionText.textContent = q.text;
      els.optionsList.innerHTML = '';
      q.options.forEach((opt) => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt.text;
        btn.dataset.type = opt.type;
        btn.addEventListener('click', onOptionSelect);
        li.appendChild(btn);
        els.optionsList.appendChild(li);
      });

      // Fade in
      els.questionText.style.transition = 'opacity 300ms ease';
      els.optionsList.style.transition = 'opacity 300ms ease';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          els.questionText.style.opacity = '1';
          els.optionsList.style.opacity = '1';
        });
      });
    }, 250);
  }

  // ===== Option select =====
  function onOptionSelect(e) {
    const btn = e.currentTarget;
    const type = btn.dataset.type;

    // Visual feedback
    btn.classList.add('selected');
    document.querySelectorAll('.option-btn').forEach((b) => {
      b.disabled = true;
    });

    scores[type] += 1;
    currentIndex += 1;

    setTimeout(() => {
      if (currentIndex < QUESTIONS.length) {
        renderQuestion();
      } else {
        finishDiagnosis();
      }
    }, 350);
  }

  // ===== Finish =====
  function finishDiagnosis() {
    showScreen('analyzing');

    // Calculate result
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const mainType = sorted[0][0];
    const subType  = sorted[1][0];

    const result = { mainType, subType, scores: { ...scores }, savedAt: Date.now() };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    } catch (e) {
      // localStorage unavailable — continue without saving
    }

    setTimeout(() => {
      renderResult(result);
      showScreen('result');
    }, 2000);
  }

  // ===== Render result =====
  function renderResult(result) {
    const data    = TYPE_DATA[result.mainType];
    const subData = TYPE_DATA[result.subType];
    const hero    = document.getElementById('result-hero');

    // Set type color
    hero.dataset.type = result.mainType;
    document.getElementById('result-badge').textContent = TYPE_LABELS[result.mainType];
    document.getElementById('result-name').textContent = data.name;
    document.getElementById('result-catchcopy').textContent = data.catchcopy;
    document.getElementById('result-subtype').textContent =
      'サブタイプ：' + TYPE_LABELS[result.subType] + '（' + subData.name + '）';

    // Type color mapping
    const typeColors = {
      story:    '#B85450',
      sense:    '#7A9E7E',
      relation: '#5A7BAA',
      inquiry:  '#9B7EC8',
    };
    hero.style.background =
      'linear-gradient(135deg, ' + typeColors[result.mainType] + ' 0%, rgba(0,0,0,0.25) 100%)';

    // Content cards
    document.getElementById('result-core').textContent     = data.core;
    document.getElementById('result-shake').textContent    = data.shake;
    document.getElementById('result-strength').textContent = data.strength;
    document.getElementById('result-trap').textContent     = data.trap;
    document.getElementById('result-growth').textContent   = data.growth;
    document.getElementById('result-match').textContent    = data.match;

    // Score bars
    const total = Object.values(result.scores).reduce((a, b) => a + b, 0) || 1;
    const barsEl = document.getElementById('type-bars');
    barsEl.innerHTML = '';
    const sortedScores = Object.entries(result.scores).sort((a, b) => b[1] - a[1]);
    sortedScores.forEach(([type, score]) => {
      const pct = Math.round((score / total) * 100);
      barsEl.innerHTML +=
        '<div class="type-bar-item">' +
        '<span class="type-bar-label">' + TYPE_LABELS[type] + '</span>' +
        '<div class="type-bar-track">' +
        '<div class="type-bar-fill ' + type + '" style="width:0%" data-pct="' + pct + '"></div>' +
        '</div>' +
        '<span class="type-bar-score">' + score + '</span>' +
        '</div>';
    });

    // Animate bars after paint
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.querySelectorAll('.type-bar-fill').forEach((el) => {
          el.style.width = el.dataset.pct + '%';
        });
      });
    });

    // Share URLs
    const shareText = encodeURIComponent(
      '私の「選ばれ続ける」資質タイプは【' + data.name + '】でした！\n' +
      data.catchcopy + '\n\n#GDS診断 #永続型資産コンテキスト'
    );
    const pageUrl = encodeURIComponent(location.href);
    document.getElementById('share-x').href =
      'https://twitter.com/intent/tweet?text=' + shareText + '&url=' + pageUrl;
    document.getElementById('share-line').href =
      'https://social-plugins.line.me/lineit/share?url=' + pageUrl +
      '&text=' + shareText;
  }

  // ===== Init =====
  function init() {
    // Show start screen with fade
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        screens.start.classList.add('visible');
      });
    });

    els.btnStart.addEventListener('click', () => {
      currentIndex = 0;
      Object.keys(scores).forEach((k) => { scores[k] = 0; });
      showScreen('question');
      setTimeout(renderQuestion, 50);
    });

    els.btnRetry.addEventListener('click', () => {
      currentIndex = 0;
      Object.keys(scores).forEach((k) => { scores[k] = 0; });
      showScreen('start');
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
