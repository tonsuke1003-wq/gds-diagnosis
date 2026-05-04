(function () {
  'use strict';

  const STORAGE_KEY = 'gds_diagnosis_result';
  const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;

  // ===== Generator Questions =====
  const GEN_QUESTIONS = [
    {
      id: 1,
      text: 'あなたが一番「役に立てた」と感じるのはどんな時ですか？',
      options: [
        { text: '相手が決断や行動に踏み出せた時',         key: 'help_action' },
        { text: '相手が「これだ！」と気づきを得た時',     key: 'help_insight' },
        { text: '相手が安心・癒しを感じてくれた時',       key: 'help_comfort' },
        { text: '相手が知識・スキルを身につけられた時',   key: 'help_knowledge' },
      ],
    },
    {
      id: 2,
      text: 'あなたが提供したい価値・サービスのジャンルに一番近いのは？',
      options: [
        { text: 'コーチング・コンサルティング・相談',     key: 'genre_consult' },
        { text: '教育・学習・スキルアップ',               key: 'genre_education' },
        { text: 'クリエイティブ・表現・制作',             key: 'genre_creative' },
        { text: 'コミュニティ・繋がり・場作り',           key: 'genre_community' },
      ],
    },
    {
      id: 3,
      text: '仕事やアウトプットで「これだけは外せない」こだわりは？',
      options: [
        { text: '結果にコミット。数字や成果で語れること', key: 'must_result' },
        { text: '本質を突く。表面でなく根本に触れること', key: 'must_essence' },
        { text: '温かさ。安心・信頼を感じてもらえること', key: 'must_warmth' },
        { text: 'オリジナリティ。ほかにない視点や表現',   key: 'must_unique' },
      ],
    },
    {
      id: 4,
      text: 'あなたが「苦手・避けたい」と感じる仕事スタイルは？',
      options: [
        { text: '決められた答えだけを伝えるルーチン業務', key: 'weak_routine' },
        { text: '数字やデータばかりを扱う無機質な作業',   key: 'weak_data' },
        { text: '浅い関係性での量産型サービス',           key: 'weak_shallow' },
        { text: '感情・感覚を無視した論理だけのやり取り', key: 'weak_logic' },
      ],
    },
    {
      id: 5,
      text: 'あなたが「もっとこうしたい」と思う理想の働き方に近いのは？',
      options: [
        { text: '少人数の深い関わり。1人ひとりに全力投球', key: 'ideal_deep' },
        { text: '多くの人に影響を与える。広い発信・媒体',   key: 'ideal_broad' },
        { text: 'チームで作る。仲間と役割分担して動く',     key: 'ideal_team' },
        { text: '自分のペースで。質を追求しながらひとりで', key: 'ideal_solo' },
      ],
    },
  ];

  // ===== State =====
  let diagResult = null;
  let genAnswers = [];
  let genIndex   = 0;

  // ===== Element refs =====
  const screens = {
    start:     document.getElementById('screen-gen-start'),
    question:  document.getElementById('screen-gen-question'),
    analyzing: document.getElementById('screen-gen-analyzing'),
    result:    document.getElementById('screen-gen-result'),
  };

  // ===== Screen transitions =====
  function showScreen(name) {
    Object.values(screens).forEach((el) => {
      el.classList.remove('active', 'visible');
    });
    const target = screens[name];
    target.classList.add('active');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        target.classList.add('visible');
      });
    });
  }

  // ===== Load diagnosis result =====
  function loadDiagnosis() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return null;
  }

  // ===== Init start screen =====
  function initStartScreen() {
    diagResult = loadDiagnosis();

    const noDiagMsg       = document.getElementById('no-diagnosis-msg');
    const hasDiagBlock    = document.getElementById('has-diagnosis-block');
    const reminderBanner  = document.getElementById('reminder-banner');
    const genTypeLabel    = document.getElementById('gen-type-label');
    const genTypeName     = document.getElementById('gen-type-name');

    if (!diagResult) {
      noDiagMsg.classList.remove('hidden');
      hasDiagBlock.classList.add('hidden');
      return;
    }

    // Show diagnosis summary
    noDiagMsg.classList.add('hidden');
    hasDiagBlock.classList.remove('hidden');

    const typeLabel = TYPE_LABELS[diagResult.mainType] || diagResult.mainType;
    const typeName  = (TYPE_DATA[diagResult.mainType] || {}).name || typeLabel;
    genTypeLabel.textContent = typeLabel;
    genTypeName.textContent  = typeName;

    // 3-month reminder
    if (diagResult.savedAt && (Date.now() - diagResult.savedAt) > THREE_MONTHS_MS) {
      reminderBanner.classList.remove('hidden');
    }

    document.getElementById('btn-gen-start').addEventListener('click', () => {
      genAnswers = [];
      genIndex   = 0;
      showScreen('question');
      setTimeout(renderGenQuestion, 50);
    });
  }

  // ===== Render generator question =====
  function renderGenQuestion() {
    const q = GEN_QUESTIONS[genIndex];
    const progressBar  = document.getElementById('gen-progress-bar');
    const progressText = document.getElementById('gen-progress-text');
    const questionText = document.getElementById('gen-question-text');
    const optionsList  = document.getElementById('gen-options-list');

    const pct = (genIndex / GEN_QUESTIONS.length) * 100;
    progressBar.style.width  = pct + '%';
    progressText.textContent = (genIndex + 1) + ' / ' + GEN_QUESTIONS.length;

    questionText.style.opacity = '0';
    optionsList.style.opacity  = '0';

    setTimeout(() => {
      questionText.textContent = q.text;
      optionsList.innerHTML    = '';

      q.options.forEach((opt) => {
        const li  = document.createElement('li');
        const btn = document.createElement('button');
        btn.className    = 'option-btn';
        btn.textContent  = opt.text;
        btn.dataset.key  = opt.key;
        btn.addEventListener('click', onGenOptionSelect);
        li.appendChild(btn);
        optionsList.appendChild(li);
      });

      questionText.style.transition = 'opacity 300ms ease';
      optionsList.style.transition  = 'opacity 300ms ease';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          questionText.style.opacity = '1';
          optionsList.style.opacity  = '1';
        });
      });
    }, 250);
  }

  // ===== Option select =====
  function onGenOptionSelect(e) {
    const btn = e.currentTarget;
    btn.classList.add('selected');
    document.querySelectorAll('#gen-options-list .option-btn').forEach((b) => {
      b.disabled = true;
    });

    genAnswers.push({ questionId: GEN_QUESTIONS[genIndex].id, key: btn.dataset.key });
    genIndex += 1;

    setTimeout(() => {
      if (genIndex < GEN_QUESTIONS.length) {
        renderGenQuestion();
      } else {
        finishGenerator();
      }
    }, 350);
  }

  // ===== Finish =====
  function finishGenerator() {
    showScreen('analyzing');
    setTimeout(() => {
      const promptText = buildPrompt();
      document.getElementById('gen-result-text').textContent = promptText;
      showScreen('result');
    }, 2000);
  }

  // ===== Build prompt =====
  function buildPrompt() {
    if (!diagResult) return '';

    const typeData   = TYPE_DATA[diagResult.mainType] || {};
    const subData    = TYPE_DATA[diagResult.subType]  || {};
    const typeLabel  = TYPE_LABELS[diagResult.mainType] || diagResult.mainType;
    const subLabel   = TYPE_LABELS[diagResult.subType]  || diagResult.subType;

    // Parse answers
    const answerMap = {};
    genAnswers.forEach((a) => { answerMap[a.questionId] = a.key; });

    const helpMap = {
      help_action:    '相手が行動・決断に踏み出せるよう背中を押すこと',
      help_insight:   '相手に気づきや発見をもたらすこと',
      help_comfort:   '相手に安心・安全・癒しを届けること',
      help_knowledge: '相手の知識やスキルを底上げすること',
    };
    const genreMap = {
      genre_consult:   'コーチング・コンサルティング・相談支援',
      genre_education: '教育・学習・スキルアップ',
      genre_creative:  'クリエイティブ・表現・制作',
      genre_community: 'コミュニティ・繋がり・場作り',
    };
    const mustMap = {
      must_result:  '数字や成果で語れる実績志向',
      must_essence: '表面でなく本質に触れる深度',
      must_warmth:  '安心・信頼を生む温かみ',
      must_unique:  '他にない視点やオリジナリティ',
    };
    const weakMap = {
      weak_routine: '決められた答えだけを伝えるルーチン作業',
      weak_data:    '数字やデータだけの無機質な対応',
      weak_shallow: '浅い関係性での量産型対応',
      weak_logic:   '感情・感覚を無視した純粋ロジックだけのやり取り',
    };
    const idealMap = {
      ideal_deep:  '少人数と深く関わり1人ひとりに全力投球するスタイル',
      ideal_broad: '多くの人に影響を与える広い発信・媒体を使うスタイル',
      ideal_team:  'チームで役割分担しながら動くスタイル',
      ideal_solo:  '自分のペースで質を追求するスタイル',
    };

    const help   = helpMap[answerMap[1]]  || '—';
    const genre  = genreMap[answerMap[2]] || '—';
    const must   = mustMap[answerMap[3]]  || '—';
    const weak   = weakMap[answerMap[4]]  || '—';
    const ideal  = idealMap[answerMap[5]] || '—';

    const baseTemplate = typeData.templateText || '';

    const prompt =
      '# わたしの取説（パーソナルAIプロンプト）\n\n' +
      '## 私の資質タイプ\n' +
      '【メインタイプ】' + typeLabel + '：' + (typeData.name || '') + '\n' +
      '【サブタイプ】'   + subLabel  + '：' + (subData.name  || '') + '\n\n' +
      '## 私の本質的な強み\n' +
      baseTemplate + '\n\n' +
      '## 私が価値を発揮する場面\n' +
      '・最も役立てる瞬間：' + help  + '\n' +
      '・活動ジャンル：'     + genre + '\n' +
      '・ゆずれないこだわり：' + must  + '\n\n' +
      '## 私の苦手・避けたいこと\n' +
      '・' + weak + '\n\n' +
      '## 理想の働き方\n' +
      '・' + ideal + '\n\n' +
      '## AIへのお願い\n' +
      '上記の私の特性・価値観・強みを踏まえた上で回答してください。\n' +
      '私の本質（' + (typeData.core || typeLabel) + '）が伝わる表現や提案を優先してください。\n' +
      '「' + (typeData.catchcopy || '') + '」という私の価値を活かせる視点で考えてください。';

    return prompt;
  }

  // ===== Copy button =====
  function initCopyButton() {
    const copyBtn = document.getElementById('btn-copy');
    copyBtn.addEventListener('click', () => {
      const text = document.getElementById('gen-result-text').textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          copyBtn.textContent = 'コピーしました！';
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.textContent = 'コピーする';
            copyBtn.classList.remove('copied');
          }, 2500);
        }).catch(() => fallbackCopy(text, copyBtn));
      } else {
        fallbackCopy(text, copyBtn);
      }
    });
  }

  function fallbackCopy(text, btn) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity  = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      btn.textContent = 'コピーしました！';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = 'コピーする';
        btn.classList.remove('copied');
      }, 2500);
    } catch (e) { /* silent */ }
    document.body.removeChild(ta);
  }

  // ===== Init =====
  function init() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        screens.start.classList.add('visible');
      });
    });

    initStartScreen();
    initCopyButton();

    document.getElementById('btn-gen-retry').addEventListener('click', () => {
      genAnswers = [];
      genIndex   = 0;
      showScreen('start');
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
