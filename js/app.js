/* Whisky Note — 画面描画とルーティング */

const app = document.getElementById('app');

/* ---------- ユーティリティ ---------- */

const catById = (id) => CATEGORIES.find((c) => c.id === id);
const brandById = (id) => BRANDS.find((b) => b.id === id);
const brandsOf = (catId) => BRANDS.filter((b) => b.cat === catId);

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

function stars(n, max = 5) {
  const filled = Math.max(0, Math.min(max, Number(n) || 0));
  return '★'.repeat(filled) + '☆'.repeat(max - filled);
}

function meter(value, max = 5) {
  const cells = [];
  for (let i = 1; i <= max; i++) {
    cells.push(`<span class="meter-cell${i <= value ? ' on' : ''}"></span>`);
  }
  return `<span class="meter" role="img" aria-label="${value}/${max}">${cells.join('')}</span>`;
}

/** ローカルタイムゾーンの今日を YYYY-MM-DD で返す（toISOString は UTC になるため使わない） */
function todayLocal() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function formatDate(iso) {
  if (!iso) return '日付未設定';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${y}年${Number(m)}月${Number(d)}日`;
}

/* ---------- 共通パーツ ---------- */

function statusBadge(brandId) {
  const rec = Store.get(brandId);
  const parts = [];
  if (rec.status === 'drunk') parts.push('<span class="badge drunk">飲んだ</span>');
  if (rec.status === 'want') parts.push('<span class="badge want">飲みたい</span>');
  if (rec.favorite) parts.push('<span class="badge fav">★お気に入り</span>');
  if (rec.notes.length) parts.push(`<span class="badge note">メモ${rec.notes.length}</span>`);
  return parts.join('');
}

function brandCard(brand) {
  const cat = catById(brand.cat);
  return `
    <a class="brand-card" href="#/brand/${brand.id}">
      <div class="brand-card-head">
        <h3>${esc(brand.name)}</h3>
        <p class="brand-en">${esc(brand.nameEn)}</p>
      </div>
      <p class="brand-meta">${esc(cat ? cat.name.replace('ウイスキー', '') : '')} ・ ${esc(brand.sub)} ・ ${esc(brand.type)} ・ ${brand.abv}%</p>
      <p class="brand-tags">${brand.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</p>
      <div class="brand-card-foot">
        <span class="price">${esc(brand.price)}</span>
        <span class="badges">${statusBadge(brand.id)}</span>
      </div>
    </a>`;
}

function profileBlock(profile) {
  return `
    <ul class="profile">
      ${Object.entries(PROFILE_LABELS).map(([key, label]) => `
        <li><span class="profile-label">${label}</span>${meter(profile[key])}</li>
      `).join('')}
    </ul>`;
}

/* ---------- ホーム（分類一覧） ---------- */

function viewHome() {
  const s = Store.stats();
  return `
    <section class="hero">
      <h1>ウイスキーを、分類から知る。</h1>
      <p>スコッチ、バーボン、ジャパニーズ——${CATEGORIES.length}分類 ${BRANDS.length}銘柄。特徴を読んで、飲んだ一杯を記録しよう。</p>
      <div class="stat-row">
        <a class="stat" href="#/mypage?tab=drunk"><b>${s.drunk}</b><span>飲んだ</span></a>
        <a class="stat" href="#/mypage?tab=want"><b>${s.want}</b><span>飲みたい</span></a>
        <a class="stat" href="#/mypage?tab=favorite"><b>${s.favorite}</b><span>お気に入り</span></a>
        <a class="stat" href="#/mypage?tab=notes"><b>${s.notes}</b><span>メモ</span></a>
      </div>
    </section>

    <h2 class="section-title">分類一覧</h2>
    <div class="cat-grid">
      ${CATEGORIES.map((c) => {
        const list = brandsOf(c.id);
        const drunk = list.filter((b) => Store.get(b.id).status === 'drunk').length;
        return `
        <a class="cat-card" href="#/category/${c.id}">
          <span class="cat-emoji">${c.emoji}</span>
          <h3>${esc(c.name)}</h3>
          <p class="cat-en">${esc(c.nameEn)}</p>
          <p class="cat-country">${esc(c.country)}</p>
          <p class="cat-summary">${esc(c.summary)}</p>
          <p class="cat-count">${list.length}銘柄収録 ／ 飲んだ ${drunk}</p>
        </a>`;
      }).join('')}
    </div>`;
}

/* ---------- 分類詳細 ---------- */

function viewCategory(id) {
  const c = catById(id);
  if (!c) return notFound('分類が見つかりませんでした。');
  const list = brandsOf(id);

  return `
    <p class="crumb"><a href="#/">分類一覧</a> ／ ${esc(c.name)}</p>

    <section class="cat-hero">
      <span class="cat-hero-emoji">${c.emoji}</span>
      <div>
        <h1>${esc(c.name)}</h1>
        <p class="cat-en">${esc(c.nameEn)} ・ ${esc(c.country)}</p>
        <p class="lead">${esc(c.summary)}</p>
      </div>
    </section>

    <div class="panel-grid">
      <section class="panel">
        <h2>この分類の特徴</h2>
        <ul class="bullets">
          ${c.features.map((f) => `<li>${esc(f)}</li>`).join('')}
        </ul>
      </section>

      <section class="panel">
        <h2>主な産地・スタイル</h2>
        <dl class="region-list">
          ${c.regions.map((r) => `<dt>${esc(r.name)}</dt><dd>${esc(r.desc)}</dd>`).join('')}
        </dl>
      </section>

      <section class="panel">
        <h2>おすすめの飲み方</h2>
        <p>${esc(c.howto)}</p>
        <h2 class="mt">相性のよい食べ物</h2>
        <p>${esc(c.pairing)}</p>
      </section>
    </div>

    <h2 class="section-title">${esc(c.name)}の銘柄（${list.length}）</h2>
    <div class="brand-grid">
      ${list.map(brandCard).join('')}
    </div>`;
}

/* ---------- 銘柄詳細 ---------- */

function viewBrand(id) {
  const b = brandById(id);
  if (!b) return notFound('銘柄が見つかりませんでした。');
  const c = catById(b.cat);
  const rec = Store.get(b.id);

  const notesHtml = rec.notes.length
    ? rec.notes.map((n) => `
        <article class="note-item" data-note-id="${esc(n.id)}">
          <header>
            <span class="note-date">${esc(formatDate(n.date))}</span>
            ${n.place ? `<span class="note-place">📍${esc(n.place)}</span>` : ''}
            ${n.rating ? `<span class="note-rating">${stars(n.rating)}</span>` : ''}
          </header>
          ${n.comment ? `<p class="note-comment">${esc(n.comment)}</p>` : '<p class="note-comment muted">（感想なし）</p>'}
          <div class="note-actions">
            <button type="button" class="link-btn" data-action="edit-note" data-brand="${esc(b.id)}" data-note="${esc(n.id)}">編集</button>
            <button type="button" class="link-btn danger" data-action="delete-note" data-brand="${esc(b.id)}" data-note="${esc(n.id)}">削除</button>
          </div>
        </article>`).join('')
    : '<p class="empty">まだメモがありません。飲んだ日・場所・感想を残しておくと、次に選ぶときの手がかりになります。</p>';

  return `
    <p class="crumb"><a href="#/">分類一覧</a> ／ <a href="#/category/${c.id}">${esc(c.name)}</a> ／ ${esc(b.name)}</p>

    <section class="brand-hero">
      <div class="brand-hero-main">
        <p class="brand-cat">${c.emoji} ${esc(c.name)}</p>
        <h1>${esc(b.name)}</h1>
        <p class="brand-en">${esc(b.nameEn)}</p>
        <ul class="spec">
          <li><span>産地・蒸溜所</span><b>${esc(b.sub)}</b></li>
          <li><span>タイプ</span><b>${esc(b.type)}</b></li>
          <li><span>アルコール度数</span><b>${b.abv}%</b></li>
          <li><span>参考価格</span><b>${esc(b.price)}</b></li>
        </ul>
        <p class="brand-tags">${b.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</p>
      </div>
      <div class="brand-hero-side">
        <h2>味わいの傾向</h2>
        ${profileBlock(b.profile)}
      </div>
    </section>

    <div class="action-bar">
      <button type="button" class="btn toggle${rec.status === 'drunk' ? ' active' : ''}" data-action="status" data-status="drunk" data-brand="${b.id}">🥃 飲んだ</button>
      <button type="button" class="btn toggle${rec.status === 'want' ? ' active' : ''}" data-action="status" data-status="want" data-brand="${b.id}">📝 飲みたい</button>
      <button type="button" class="btn toggle fav${rec.favorite ? ' active' : ''}" data-action="favorite" data-brand="${b.id}">${rec.favorite ? '★' : '☆'} お気に入り</button>
      <button type="button" class="btn primary" data-action="add-note" data-brand="${b.id}">＋ メモを追加</button>
    </div>

    <div class="panel-grid two">
      <section class="panel">
        <h2>この銘柄の特徴</h2>
        <p>${esc(b.desc)}</p>
      </section>
      <section class="panel">
        <h2>テイスティングノート</h2>
        <dl class="tasting">
          <dt>香り（Nose）</dt><dd>${esc(b.tasting.nose)}</dd>
          <dt>味わい（Palate）</dt><dd>${esc(b.tasting.palate)}</dd>
          <dt>余韻（Finish）</dt><dd>${esc(b.tasting.finish)}</dd>
        </dl>
      </section>
    </div>

    <h2 class="section-title">マイメモ（${rec.notes.length}）</h2>
    <div class="note-list">${notesHtml}</div>

    <h2 class="section-title">同じ分類の他の銘柄</h2>
    <div class="brand-grid">
      ${brandsOf(b.cat).filter((x) => x.id !== b.id).slice(0, 6).map(brandCard).join('')}
    </div>`;
}

/* ---------- マイページ ---------- */

const MYPAGE_TABS = [
  { id: 'drunk', label: '飲んだ' },
  { id: 'want', label: '飲みたい' },
  { id: 'favorite', label: 'お気に入り' },
  { id: 'notes', label: 'メモ一覧' },
  { id: 'data', label: 'データ管理' },
];

function viewMypage(params) {
  const tab = MYPAGE_TABS.some((t) => t.id === params.tab) ? params.tab : 'drunk';
  const s = Store.stats();

  let body;
  if (tab === 'notes') {
    const entries = Store.allNotes();
    body = entries.length
      ? `<div class="note-list wide">${entries.map(({ brandId, note }) => {
          const b = brandById(brandId);
          return `
            <article class="note-item">
              <header>
                <a class="note-brand" href="#/brand/${encodeURIComponent(brandId)}">${esc(b ? b.name : brandId)}</a>
                <span class="note-date">${esc(formatDate(note.date))}</span>
                ${note.place ? `<span class="note-place">📍${esc(note.place)}</span>` : ''}
                ${note.rating ? `<span class="note-rating">${stars(note.rating)}</span>` : ''}
              </header>
              ${note.comment ? `<p class="note-comment">${esc(note.comment)}</p>` : ''}
              <div class="note-actions">
                <button type="button" class="link-btn" data-action="edit-note" data-brand="${esc(brandId)}" data-note="${esc(note.id)}">編集</button>
                <button type="button" class="link-btn danger" data-action="delete-note" data-brand="${esc(brandId)}" data-note="${esc(note.id)}">削除</button>
              </div>
            </article>`;
        }).join('')}</div>`
      : '<p class="empty">メモはまだありません。銘柄ページの「＋ メモを追加」から記録できます。</p>';
  } else if (tab === 'data') {
    body = `
      <section class="panel">
        <h2>バックアップ</h2>
        <p>記録はこのブラウザ内にのみ保存されます。機種変更やブラウザのデータ削除に備えて、JSONで書き出しておけます。</p>
        <div class="action-bar left">
          <button type="button" class="btn" data-action="export">JSONを書き出す</button>
          <button type="button" class="btn" data-action="import">JSONを読み込む</button>
          <button type="button" class="btn danger" data-action="clear">すべての記録を削除</button>
        </div>
        <input type="file" id="import-file" accept="application/json,.json" hidden>
        <p class="footnote">「読み込む」を実行すると、現在の記録は読み込んだ内容で置き換えられます。</p>
      </section>`;
  } else {
    const ids = tab === 'favorite'
      ? Store.idsBy((i) => i.favorite)
      : Store.idsBy((i) => i.status === tab);
    const list = ids.map(brandById).filter(Boolean);
    const emptyMsg = {
      drunk: 'まだ「飲んだ」登録がありません。銘柄ページで登録できます。',
      want: '「飲みたい」リストは空です。気になる銘柄を登録しておきましょう。',
      favorite: 'お気に入りはまだありません。',
    }[tab];
    body = list.length
      ? `<div class="brand-grid">${list.map(brandCard).join('')}</div>`
      : `<p class="empty">${emptyMsg}</p>`;
  }

  return `
    <section class="hero compact">
      <h1>マイページ</h1>
      <div class="stat-row">
        <span class="stat"><b>${s.drunk}</b><span>飲んだ</span></span>
        <span class="stat"><b>${s.want}</b><span>飲みたい</span></span>
        <span class="stat"><b>${s.favorite}</b><span>お気に入り</span></span>
        <span class="stat"><b>${s.notes}</b><span>メモ</span></span>
      </div>
    </section>

    <div class="tabs">
      ${MYPAGE_TABS.map((t) => `<a class="tab${t.id === tab ? ' active' : ''}" href="#/mypage?tab=${t.id}">${t.label}</a>`).join('')}
    </div>

    ${body}`;
}

/* ---------- 検索 ---------- */

function viewSearch(params) {
  const q = (params.q || '').trim();
  if (!q) return '<p class="empty">検索したい語を入力してください。</p>';

  const needle = q.toLowerCase();
  const hits = BRANDS.filter((b) => {
    const cat = catById(b.cat);
    const hay = [
      b.name, b.nameEn, b.sub, b.type, b.desc, b.tags.join(' '),
      b.tasting.nose, b.tasting.palate, b.tasting.finish,
      cat ? cat.name : '', cat ? cat.nameEn : '', cat ? cat.country : '',
    ].join(' ').toLowerCase();
    return hay.includes(needle);
  });

  const catHits = CATEGORIES.filter((c) =>
    [c.name, c.nameEn, c.country, c.summary, c.features.join(' ')]
      .join(' ').toLowerCase().includes(needle));

  return `
    <h1 class="page-title">「${esc(q)}」の検索結果</h1>
    ${catHits.length ? `
      <h2 class="section-title">分類（${catHits.length}）</h2>
      <div class="cat-grid">
        ${catHits.map((c) => `
          <a class="cat-card" href="#/category/${c.id}">
            <span class="cat-emoji">${c.emoji}</span>
            <h3>${esc(c.name)}</h3>
            <p class="cat-summary">${esc(c.summary)}</p>
          </a>`).join('')}
      </div>` : ''}
    <h2 class="section-title">銘柄（${hits.length}）</h2>
    ${hits.length
      ? `<div class="brand-grid">${hits.map(brandCard).join('')}</div>`
      : '<p class="empty">該当する銘柄が見つかりませんでした。</p>'}`;
}

function notFound(msg) {
  return `<p class="empty">${esc(msg)} <a href="#/">分類一覧へ戻る</a></p>`;
}

/* ---------- ルーティング ---------- */

function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, query = ''] = raw.split('?');
  const params = {};
  new URLSearchParams(query).forEach((v, k) => { params[k] = v; });
  return { segments: path.split('/').filter(Boolean), params };
}

function render() {
  const { segments, params } = parseHash();
  const [head, arg] = segments;

  let html;
  if (!head) html = viewHome();
  else if (head === 'category') html = viewCategory(arg);
  else if (head === 'brand') html = viewBrand(arg);
  else if (head === 'mypage') html = viewMypage(params);
  else if (head === 'search') html = viewSearch(params);
  else html = notFound('ページが見つかりませんでした。');

  app.innerHTML = html;

  document.querySelectorAll('.main-nav a').forEach((a) => {
    const key = a.dataset.nav;
    a.classList.toggle('active', (key === 'home' && head !== 'mypage') || (key === 'mypage' && head === 'mypage'));
  });

  // 検索画面を離れたら入力欄も空に戻す（前の検索語が残らないように）
  document.getElementById('search-input').value = head === 'search' ? (params.q || '') : '';

  window.scrollTo(0, 0);
}

/* ---------- メモ用モーダル ---------- */

const modal = document.getElementById('modal');
const noteForm = document.getElementById('note-form');
const ratingInput = document.getElementById('rating-input');
let editing = { brandId: null, noteId: null };
let ratingValue = 0;
let lastFocused = null;

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function buildRating() {
  ratingInput.innerHTML = [1, 2, 3, 4, 5]
    .map((n) => `<button type="button" class="star" data-value="${n}" aria-label="${n}点">☆</button>`)
    .join('') + '<button type="button" class="star clear" data-value="0">クリア</button>';
}

function paintRating() {
  ratingInput.querySelectorAll('.star:not(.clear)').forEach((btn) => {
    const on = Number(btn.dataset.value) <= ratingValue;
    btn.textContent = on ? '★' : '☆';
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', String(Number(btn.dataset.value) === ratingValue));
  });
}

buildRating();
ratingInput.addEventListener('click', (e) => {
  const btn = e.target.closest('.star');
  if (!btn) return;
  ratingValue = Number(btn.dataset.value);
  paintRating();
});

function openModal(brandId, noteId) {
  const b = brandById(brandId);
  if (!b) return;
  editing = { brandId, noteId: noteId || null };
  lastFocused = document.activeElement;

  const existing = noteId ? Store.get(brandId).notes.find((n) => n.id === noteId) : null;
  noteForm.date.value = existing ? existing.date : todayLocal();
  noteForm.place.value = existing ? existing.place : '';
  noteForm.comment.value = existing ? existing.comment : '';
  ratingValue = existing ? existing.rating : 0;
  paintRating();

  document.getElementById('modal-title').textContent = noteId ? 'メモを編集' : 'テイスティングメモ';
  document.getElementById('modal-brand').textContent = `${b.name}（${b.nameEn}）`;
  modal.hidden = false;
  document.body.classList.add('modal-open');
  noteForm.date.focus();
}

function closeModal() {
  if (modal.hidden) return;
  modal.hidden = true;
  document.body.classList.remove('modal-open');
  editing = { brandId: null, noteId: null };
  // 開く前にフォーカスしていた要素へ戻す（キーボード操作で迷子にならないように）
  if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
  lastFocused = null;
}

/** モーダル内でフォーカスが一周するようにする */
function trapFocus(e) {
  const targets = [...modal.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
  if (!targets.length) return;
  const first = targets[0];
  const last = targets[targets.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  } else if (!modal.contains(document.activeElement)) {
    e.preventDefault();
    first.focus();
  }
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-cancel').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', (e) => {
  if (modal.hidden) return;
  if (e.key === 'Escape') closeModal();
  else if (e.key === 'Tab') trapFocus(e);
});

noteForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const payload = {
    date: noteForm.date.value,
    place: noteForm.place.value.trim(),
    rating: ratingValue,
    comment: noteForm.comment.value.trim(),
  };
  if (editing.noteId) Store.updateNote(editing.brandId, editing.noteId, payload);
  else Store.addNote(editing.brandId, payload);
  closeModal();
  render();
});

/* ---------- クリック委譲 ---------- */

app.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, brand, note, status } = btn.dataset;

  switch (action) {
    case 'status':
      Store.setStatus(brand, status);
      render();
      break;
    case 'favorite':
      Store.toggleFavorite(brand);
      render();
      break;
    case 'add-note':
      openModal(brand, null);
      break;
    case 'edit-note':
      openModal(brand, note);
      break;
    case 'delete-note':
      if (confirm('このメモを削除します。よろしいですか？')) {
        Store.removeNote(brand, note);
        render();
      }
      break;
    case 'export': {
      const blob = new Blob([Store.exportJson()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `whisky-note-${todayLocal()}.json`;
      a.click();
      // 即座に revoke するとダウンロードが始まらないブラウザがあるため少し待つ
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      break;
    }
    case 'import':
      document.getElementById('import-file').click();
      break;
    case 'clear':
      if (confirm('すべての記録（飲んだ／飲みたい／お気に入り／メモ）を削除します。元に戻せません。')) {
        Store.clearAll();
        render();
      }
      break;
  }
});

app.addEventListener('change', (e) => {
  if (e.target.id !== 'import-file') return;
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const count = Store.importJson(reader.result);
      alert(`読み込みました（${count}銘柄分の記録）。`);
      render();
    } catch (err) {
      alert('読み込みに失敗しました：' + err.message);
    }
  };
  reader.onerror = () => alert('ファイルを読み取れませんでした。');
  reader.readAsText(file);
  e.target.value = ''; // 同じファイルを続けて選べるように
});

/* ---------- 検索フォーム ---------- */

document.getElementById('search-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = document.getElementById('search-input').value.trim();
  const next = q ? `#/search?q=${encodeURIComponent(q)}` : '#/';
  if (location.hash === next) render(); // 同じハッシュだと hashchange が飛ばないため
  else location.hash = next;
});

/* ---------- 起動 ---------- */

window.addEventListener('hashchange', () => {
  closeModal(); // ブラウザバックでモーダルが開いたまま残らないように
  render();
});
render();
