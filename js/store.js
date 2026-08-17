/**
 * localStorage への保存を担当する薄いレイヤー。
 * データ形状:
 * {
 *   version: 1,
 *   items: {
 *     [brandId]: {
 *       status: 'drunk' | 'want' | null,
 *       favorite: boolean,
 *       notes: [{ id, date, place, rating, comment, createdAt }]
 *     }
 *   }
 * }
 */

const STORAGE_KEY = 'whisky-note:v1';

const Store = (() => {
  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      return normalizeState(JSON.parse(raw));
    } catch (e) {
      console.warn('保存データの読み込みに失敗しました。初期化します。', e);
      return emptyState();
    }
  }

  function emptyState() {
    return { version: 1, items: {} };
  }

  function text(value, max) {
    return typeof value === 'string' ? value.slice(0, max) : '';
  }

  function normalizeNote(raw, seenIds) {
    if (!raw || typeof raw !== 'object') return null;
    let id = typeof raw.id === 'string' && raw.id ? raw.id : newId();
    if (seenIds.has(id)) id = newId();
    seenIds.add(id);

    const date = text(raw.date, 10);
    const rating = Math.round(Number(raw.rating));
    return {
      id,
      date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '',
      place: text(raw.place, 60),
      rating: Number.isFinite(rating) ? Math.min(5, Math.max(0, rating)) : 0,
      comment: text(raw.comment, 1000),
      createdAt: text(raw.createdAt, 40) || new Date().toISOString(),
    };
  }

  function normalizeItem(raw) {
    const item = { status: null, favorite: false, notes: [] };
    if (!raw || typeof raw !== 'object') return item;
    if (raw.status === 'drunk' || raw.status === 'want') item.status = raw.status;
    item.favorite = raw.favorite === true;
    if (Array.isArray(raw.notes)) {
      const seenIds = new Set();
      item.notes = raw.notes.map((n) => normalizeNote(n, seenIds)).filter(Boolean);
    }
    return item;
  }

  /** 外部由来のデータ（localStorage / インポートJSON）を既知の形へ整える */
  function normalizeState(raw) {
    if (!raw || typeof raw !== 'object' || !raw.items || typeof raw.items !== 'object') {
      return emptyState();
    }
    const items = {};
    Object.entries(raw.items).forEach(([brandId, value]) => {
      if (typeof brandId !== 'string' || !brandId) return;
      const item = normalizeItem(value);
      // 何も記録がないエントリは持ち込まない
      if (item.status || item.favorite || item.notes.length) items[brandId] = item;
    });
    return { version: 1, items };
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      alert('保存に失敗しました。ブラウザの保存容量やプライベートモードの設定をご確認ください。');
      console.error(e);
    }
  }

  function ensure(brandId) {
    if (!state.items[brandId]) {
      state.items[brandId] = { status: null, favorite: false, notes: [] };
    }
    return state.items[brandId];
  }

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  return {
    /** 銘柄の記録を取得（未登録なら空の記録を返す。副作用なし） */
    get(brandId) {
      return state.items[brandId] || { status: null, favorite: false, notes: [] };
    },

    /** 'drunk' | 'want' | null。同じ値を再指定すると解除 */
    setStatus(brandId, status) {
      const item = ensure(brandId);
      item.status = item.status === status ? null : status;
      persist();
      return item.status;
    },

    toggleFavorite(brandId) {
      const item = ensure(brandId);
      item.favorite = !item.favorite;
      persist();
      return item.favorite;
    },

    addNote(brandId, note) {
      const item = ensure(brandId);
      item.notes.unshift({
        id: newId(),
        date: note.date || '',
        place: note.place || '',
        rating: Number(note.rating) || 0,
        comment: note.comment || '',
        createdAt: new Date().toISOString(),
      });
      // メモを付けた時点で「飲んだ」扱いにしておく
      if (item.status !== 'drunk') item.status = 'drunk';
      persist();
    },

    updateNote(brandId, noteId, patch) {
      const item = state.items[brandId];
      const note = item && item.notes.find((n) => n.id === noteId);
      if (!note) return;
      Object.assign(note, {
        date: patch.date || '',
        place: patch.place || '',
        rating: Number(patch.rating) || 0,
        comment: patch.comment || '',
      });
      persist();
    },

    removeNote(brandId, noteId) {
      const item = state.items[brandId];
      if (!item) return;
      item.notes = item.notes.filter((n) => n.id !== noteId);
      persist();
    },

    /** 全メモを銘柄情報付きでフラットに返す（新しい順） */
    allNotes() {
      const out = [];
      Object.entries(state.items).forEach(([brandId, item]) => {
        (item.notes || []).forEach((note) => out.push({ brandId, note }));
      });
      return out.sort((a, b) => {
        const ad = a.note.date || a.note.createdAt || '';
        const bd = b.note.date || b.note.createdAt || '';
        return bd.localeCompare(ad);
      });
    },

    /** 条件に合う銘柄IDの配列 */
    idsBy(predicate) {
      return Object.entries(state.items)
        .filter(([, item]) => predicate(item))
        .map(([brandId]) => brandId);
    },

    stats() {
      const values = Object.values(state.items);
      return {
        drunk: values.filter((i) => i.status === 'drunk').length,
        want: values.filter((i) => i.status === 'want').length,
        favorite: values.filter((i) => i.favorite).length,
        notes: values.reduce((sum, i) => sum + (i.notes ? i.notes.length : 0), 0),
      };
    },

    exportJson() {
      return JSON.stringify(state, null, 2);
    },

    /** 読み込んだ記録の件数を返す。壊れた値は捨てて取り込む */
    importJson(json) {
      const parsed = JSON.parse(json);
      if (!parsed || typeof parsed !== 'object' || !parsed.items || typeof parsed.items !== 'object') {
        throw new Error('形式が正しくありません');
      }
      state = normalizeState(parsed);
      persist();
      return Object.keys(state.items).length;
    },

    clearAll() {
      state = emptyState();
      persist();
    },
  };
})();
