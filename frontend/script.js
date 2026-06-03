const fallbackStats = [
  { aspect: 'Trainer', value: 90, note: 'Calitatea îndrumării' },
  { aspect: 'Atmosphere', value: 83, note: 'Experiența din sală' },
  { aspect: 'Equipment', value: 88, note: 'Aparate și dotări' },
  { aspect: 'Energy', value: 85, note: 'Nivel de energie' },
  { aspect: 'Guidance', value: 79, note: 'Direcție și suport' },
  { aspect: 'Community', value: 76, note: 'Atmosferă socială' },
  { aspect: 'Negative', value: 22, note: 'Probleme și frustrări' },
];

const keywords = {
  positive: ['rapid', 'excelent', 'util', 'clar', 'bun', 'super', 'ușor', 'prietenos', 'solid'],
  negative: ['prost', 'lent', 'confuz', 'greu', 'slab', 'problemă', 'eror', 'defect', 'neclar'],
  trainer: ['trainer', 'antrenor', 'coach', 'instruc'],
  atmosphere: ['atmosfer', 'ambient', 'vibe', 'ambient'],
  equipment: ['equipment', 'echipament', 'aparat', 'ganter', 'halter', 'benzi'],
  energy: ['energie', 'energic', 'motivant', 'intens', 'vital'],
  guidance: ['guidance', 'ghidare', 'îndrumare', 'indrumare', 'suport'],
  community: ['community', 'comunitate', 'colegi', 'grup', 'social'],
};

const reviewInput = document.getElementById('reviewInput');
const analyzeButton = document.getElementById('analyzeButton');
const analysisNote = document.getElementById('analysisNote');
const statusMessage = document.getElementById('statusMessage');
const scoreValue = document.getElementById('scoreValue');
const resultTitle = document.getElementById('resultTitle');
const resultDescription = document.getElementById('resultDescription');
const tagList = document.getElementById('tagList');
const statsChart = document.getElementById('statsChart');
const statsMeta = document.getElementById('statsMeta');

const MOCK_LATENCY_MS = 850;
const MOCK_TIMEOUT_MS = 2500;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function countMatches(text, tokens) {
  return tokens.reduce((count, token) => count + (text.includes(token) ? 1 : 0), 0);
}

function buildScore(text) {
  const normalized = text.toLowerCase();
  const positiveHits = countMatches(normalized, keywords.positive);
  const negativeHits = countMatches(normalized, keywords.negative);
  const trainerHits = countMatches(normalized, keywords.trainer);
  const atmosphereHits = countMatches(normalized, keywords.atmosphere);
  const equipmentHits = countMatches(normalized, keywords.equipment);
  const energyHits = countMatches(normalized, keywords.energy);
  const guidanceHits = countMatches(normalized, keywords.guidance);
  const communityHits = countMatches(normalized, keywords.community);

  let score = 62 + positiveHits * 8 + trainerHits * 5 + atmosphereHits * 4 + equipmentHits * 4 + energyHits * 5 + guidanceHits * 5 + communityHits * 4 - negativeHits * 9;
  if (normalized.length > 220) {
    score += 4;
  }
  if (/[!?]/.test(text)) {
    score += 2;
  }

  score = clamp(Math.round(score), 0, 100);

  const tags = [];
  if (positiveHits > 0) tags.push({ label: 'Ton pozitiv', tone: 'positive' });
  if (trainerHits > 0) tags.push({ label: 'Trainer', tone: 'neutral' });
  if (atmosphereHits > 0) tags.push({ label: 'Atmosphere', tone: 'positive' });
  if (equipmentHits > 0) tags.push({ label: 'Equipment', tone: 'positive' });
  if (energyHits > 0) tags.push({ label: 'Energy', tone: 'positive' });
  if (guidanceHits > 0) tags.push({ label: 'Guidance', tone: 'neutral' });
  if (communityHits > 0) tags.push({ label: 'Community', tone: 'neutral' });
  if (negativeHits > 0) tags.push({ label: 'Semne de risc', tone: 'negative' });

  if (!tags.length) {
    tags.push({ label: 'Analiză generală', tone: 'neutral' });
  }

  const title = score >= 80 ? 'Recenzie foarte bună' : score >= 60 ? 'Recenzie echilibrată' : 'Recenzie de investigat';
  const description =
    score >= 80
      ? 'Textul transmite feedback pozitiv și are suficiente indicii de claritate și utilitate.'
      : score >= 60
        ? 'Textul este mixt sau neutru. Se văd câteva puncte bune, dar și zone de rafinat.'
        : 'Textul indică probleme sau ambiguități și merită o revizuire suplimentară.';

  return { score, tags, title, description };
}

function createMockAnalysis(text) {
  const normalized = text.toLowerCase();

  return new Promise((resolve, reject) => {
    if (/timeout|nu răspunde|nu raspunde|blocat|hang/.test(normalized)) {
      return;
    }

    window.setTimeout(() => {
      if (/eroare api|fail api|api error|crash/.test(normalized)) {
        reject(new Error('API-ul mock a returnat o eroare.'));
        return;
      }

      resolve(buildScore(text));
    }, MOCK_LATENCY_MS);
  });
}

function withTimeout(promise, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error('API-ul nu a răspuns în timp util. Te rugăm să încerci din nou.'));
    }, timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

function setStatus(kind, message) {
  if (!message) {
    statusMessage.hidden = true;
    statusMessage.className = 'status-message';
    statusMessage.textContent = '';
    return;
  }

  statusMessage.hidden = false;
  statusMessage.className = `status-message is-${kind}`;
  statusMessage.textContent = message;
}

function renderIdleState() {
  analyzeButton.disabled = false;
  scoreValue.textContent = '--';
  resultTitle.textContent = 'Așteptând analiza';
  resultDescription.textContent = 'Rezultatul va afișa principalele aspecte detectate și o evaluare sintetică a textului.';
  renderTags([{ label: 'Nicio recenzie introdusă', tone: 'neutral' }]);
  setStatus(null, '');
  analysisNote.textContent = 'Scrieți o recenzie și apăsați Analizează.';
}

function renderLoadingState() {
  scoreValue.textContent = '...';
  resultTitle.textContent = 'Analiză în curs';
  resultDescription.textContent = 'Mock API-ul procesează textul și pregătește rezultatul.';
  renderTags([{ label: 'Se analizează...', tone: 'neutral' }]);
  setStatus('loading', 'Se analizează...');
  analysisNote.textContent = 'Se analizează...';
  analyzeButton.disabled = true;
}

function renderSuccessState(outcome, textLength) {
  scoreValue.textContent = String(outcome.score);
  resultTitle.textContent = outcome.title;
  resultDescription.textContent = outcome.description;
  renderTags(outcome.tags);
  setStatus(null, '');
  analysisNote.textContent = `Analiză rulată pentru ${textLength} caractere.`;
}

function renderErrorState(errorMessage) {
  scoreValue.textContent = '--';
  resultTitle.textContent = 'Analiza nu a reușit';
  resultDescription.textContent = errorMessage;
  renderTags([{ label: 'API indisponibil', tone: 'negative' }]);
  setStatus('error', errorMessage);
  analysisNote.textContent = 'Reîncercați analiza după ce API-ul revine.';
}

function renderTags(tags) {
  tagList.innerHTML = tags
    .map(
      (tag) => `
        <span class="tag" data-tone="${tag.tone}">${tag.label}</span>
      `,
    )
    .join('');
}

let activeRequestId = 0;

async function analyzeReview() {
  if (analyzeButton.disabled) {
    return;
  }

  const text = reviewInput.value.trim();

  if (!text) {
    renderIdleState();
    return;
  }

  const requestId = ++activeRequestId;
  renderLoadingState();

  try {
    const outcome = await withTimeout(createMockAnalysis(text), MOCK_TIMEOUT_MS);
    if (requestId !== activeRequestId) {
      return;
    }

    renderSuccessState(outcome, text.length);
  } catch (error) {
    if (requestId !== activeRequestId) {
      return;
    }

    const message = error instanceof Error ? error.message : 'API-ul nu a răspuns.';
    renderErrorState(message);
  } finally {
    if (requestId === activeRequestId) {
      analyzeButton.disabled = false;
    }
  }
}

function renderStats(stats) {
  const maxValue = Math.max(...stats.map((item) => item.value), 100);
  statsChart.innerHTML = stats
    .map(
      (item) => `
        <div class="bar-card">
          <div class="bar-track" style="--value:${Math.round((item.value / maxValue) * 100)}" data-value="${item.value}"></div>
          <div class="bar-label">
            <strong>${item.aspect}</strong>
            <span>${item.note}</span>
          </div>
        </div>
      `,
    )
    .join('');

  statsMeta.innerHTML = stats
    .map(
      (item) => `
        <div class="meta-row">
          <strong>${item.aspect}</strong>
          <span>${item.value}%</span>
        </div>
      `,
    )
    .join('');
}

async function loadStats() {
  try {
    const response = await fetch('./aspects_stats.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Failed to fetch stats');
    }

    const stats = await response.json();
    renderStats(Array.isArray(stats) && stats.length ? stats : fallbackStats);
  } catch {
    renderStats(fallbackStats);
  }
}

analyzeButton.addEventListener('click', analyzeReview);
reviewInput.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    analyzeReview();
  }
});

reviewInput.value = 'Antrenorii sunt foarte implicati, echipamentele sunt noi, dar uneori atmosfera pare rece pentru incepatori.';
renderIdleState();
loadStats();
