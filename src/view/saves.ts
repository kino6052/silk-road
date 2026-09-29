// Save controls: IndexedDB autosave slot, file export and import. Every storage call may
// fail; failures are logged and reported, never thrown. No game logic.
import type { CivilDate } from '../core/calendar';
import { formatDate, h, t, type Send } from './dom';

const DB = 'one-belt-many-lives';
const STORE = 'saves';
const AUTOSAVE = 'autosave';
const AUTOSAVE_MS = 60_000;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('indexedDB.open failed'));
    };
  });
}

async function run<T>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = op(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(request.error ?? new Error('indexedDB request failed'));
      };
    });
  } finally {
    db.close();
  }
}

async function readSave(key: string): Promise<string | null> {
  try {
    const value = await run<unknown>('readonly', (store) => store.get(key));
    return typeof value === 'string' ? value : null;
  } catch (error) {
    console.warn('save read failed', error);
    return null;
  }
}

async function writeSave(key: string, text: string): Promise<boolean> {
  try {
    await run('readwrite', (store) => store.put(text, key));
    return true;
  } catch (error) {
    console.warn('save write failed', error);
    return false;
  }
}

/** Offers `text` as a file download. */
function download(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

/** Lets the player pick a file and passes its text on; nothing happens if they cancel. */
function pickFile(onText: (text: string) => void): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;
    file.text().then(onText, (error: unknown) => {
      console.warn('import failed', error);
    });
  });
  input.click();
}

const isoDate = (date: CivilDate) =>
  [date.year, date.month, date.day].map((n) => String(n).padStart(2, '0')).join('-');

/**
 * Save, load, export and import buttons plus the autosave loop. The worker answers each
 * `save` with a `saved` reply, in order, so `pending` says what each reply is for.
 */
export function createSaves(
  send: Send,
  status: HTMLElement,
  date: () => CivilDate | null,
): { el: HTMLElement; onSaved(text: string): void } {
  const pending: ('slot' | 'export')[] = [];
  const requestSave = (purpose: 'slot' | 'export') => {
    pending.push(purpose);
    send({ type: 'save' });
  };
  const action = (label: string, run: () => void) => {
    const el = h('button', { type: 'button' }, label);
    el.addEventListener('click', run);
    return el;
  };
  const loadSlot = () => {
    void readSave(AUTOSAVE).then((text) => {
      status.textContent = text === null ? t('ui.no-save') : t('ui.loading');
      if (text !== null) send({ type: 'load', text });
      resume.hidden = true;
    });
  };
  const resume = action(t('ui.continue'), loadSlot);
  resume.className = 'primary';
  resume.hidden = true;

  void readSave(AUTOSAVE).then((text) => {
    resume.hidden = text === null;
  });
  setInterval(() => {
    requestSave('slot');
  }, AUTOSAVE_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') requestSave('slot');
  });
  window.addEventListener('pagehide', () => {
    requestSave('slot');
  });

  const onSaved = (text: string) => {
    const now = date();
    if (pending.shift() === 'export') {
      download(`one-belt-many-lives-${now ? isoDate(now) : 'save'}.json`, text);
      return;
    }
    // The slot now holds this run, so there is nothing older to continue.
    resume.hidden = true;
    void writeSave(AUTOSAVE, text).then((ok) => {
      status.textContent = ok
        ? t('ui.saved', { date: now ? formatDate(now) : '' })
        : t('ui.save-failed');
    });
  };

  const el = h(
    'div',
    { className: 'group', role: 'group' },
    resume,
    action(t('ui.save'), () => {
      requestSave('slot');
    }),
    action(t('ui.load'), loadSlot),
    action(t('ui.export'), () => {
      requestSave('export');
    }),
    action(t('ui.import'), () => {
      pickFile((text) => {
        status.textContent = t('ui.loading');
        send({ type: 'load', text });
      });
    }),
  );
  return { el, onSaved };
}
