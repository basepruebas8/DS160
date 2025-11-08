// personal1.js
// Cumple con:
// - Sección "Imágenes" visible y funcional (guardar local, listar, ver/descargar/eliminar, progreso, refrescar).
// - Autocompleta "Nombre completo en alfabeto nativo" = Nombres + Apellidos (campo oculto).
// - Radios "Otros nombres" y "Telecódigo" forzados a "No" y ocultos.
// - "Estado/Provincia" visible; sólo se oculta su casilla "No aplica" (igual para "Nombre nativo").
// - Guarda/restaura en sessionStorage.
// - Guarda JSON NORMALIZADO de todo el formulario (incluye radios/checkboxes como valores/arrays).
// - "Siguiente" valida sólo campos requeridos visibles; si falta algo, no avanza.
// - Navega a personal2.html con query string (usa el JSON normalizado).
// - Corrige campos sin name (usa #id como clave de respaldo).
// - Evita duplicar listeners (único DOMContentLoaded).
// - Guarda metadatos de imágenes en sessionStorage (sin blobs).

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  const FORM_KEY = 'ds160-personal1-state-v3';       // JSON normalizado
  const FORM_KEY_RAW = 'ds160-personal1-raw-v3';     // crudo p/restauración fina
  const IMAGES_META_KEY = 'ds160-personal1-images-meta-v1';
  const NEXT_PAGE = 'personal2.html';

  const safe = fn => { try { fn(); } catch (e) { console.warn(e); } };

  const hide = el => {
    if (!el) return;
    el.style.display = 'none';
    el.hidden = true;
    el.setAttribute('aria-hidden', 'true');
  };

  const show = el => {
    if (!el) return;
    el.style.display = '';
    el.hidden = false;
    el.removeAttribute('aria-hidden');
  };

  // ---------- utilidades ----------

  function keyOf(el) {
    const nm = (el && el.name || '').trim();
    if (nm) return nm;
    const id = (el && el.id || '').trim();
    return id ? `#${id}` : '';
  }

  function isHiddenLike(el) {
    if (!el) return false;
    if (el.hidden) return true;
    if (el.closest && el.closest('[hidden]')) return true;
    const styleSelf = getComputedStyle(el);
    if (styleSelf.display === 'none' || styleSelf.visibility === 'hidden') return true;
    const row = el.closest && el.closest('.row');
    if (row) {
      const rowStyle = getComputedStyle(row);
      if (rowStyle.display === 'none' || rowStyle.visibility === 'hidden') return true;
    }
    return false;
  }

  function removeRequiredFromHidden(form) {
    Array.from(form.querySelectorAll('[required]')).forEach(el => {
      if (isHiddenLike(el)) {
        try { el.removeAttribute('required'); } catch {}
      }
    });
  }

  // Valida requeridos visibles (incluye grupos radio/checkbox)
  function isFormValid(form) {
    let valid = true;
    const seenRadioNames = new Set();

    Array.from(form.querySelectorAll('[required]')).forEach(el => {
      if (isHiddenLike(el)) return;

      const type = (el.type || '').toLowerCase();

      if (type === 'radio' || type === 'checkbox') {
        const groupName = el.name || keyOf(el);
        if (!groupName || seenRadioNames.has(groupName)) return;
        seenRadioNames.add(groupName);

        const sel = groupName.startsWith('#')
          ? `input#${groupName.slice(1)}`
          : `input[name="${groupName}"]`;
        const groupInputs = Array.from(form.querySelectorAll(sel));
        const anyCheckedVisible = groupInputs.some(inputEl => !isHiddenLike(inputEl) && !!inputEl.checked);

        if (!anyCheckedVisible) valid = false;
        return;
      }

      const value = (el.value || '').trim();
      if (value === '') valid = false;
    });

    return valid;
  }

  // Recolecta estado CRUDO (por control)
  function collectRaw(form) {
    const data = {};
    Array.from(form.querySelectorAll('input, select, textarea')).forEach(el => {
      const k = keyOf(el);
      if (!k) return;
      const t = (el.type || '').toLowerCase();
      if (t === 'checkbox' || t === 'radio') {
        data[k + '::' + (el.id || '')] = !!el.checked;
      } else if (t !== 'file') {
        data[k] = el.value;
      }
      // files se manejan en IndexedDB
    });
    return data;
  }

  // Recolecta estado NORMALIZADO (por campo/grupo)
  function collectNormalized(form) {
    const out = {};
    const groups = {};

    Array.from(form.querySelectorAll('input, select, textarea')).forEach(el => {
      const k = keyOf(el);
      if (!k) return;
      const t = (el.type || '').toLowerCase();

      // files: se ignoran aquí (blobs) -> sólo metadatos por separado
      if (t === 'file') return;

      if (t === 'radio') {
        const g = el.name || k;
        (groups[g] = groups[g] || { type: 'radio', inputs: [] }).inputs.push(el);
        return;
      }
      if (t === 'checkbox') {
        const g = el.name || k;
        (groups[g] = groups[g] || { type: 'checkbox', inputs: [] }).inputs.push(el);
        return;
      }

      out[k] = el.value;
    });

    Object.keys(groups).forEach(gk => {
      const g = groups[gk];
      if (g.type === 'radio') {
        const checked = g.inputs.find(i => i.checked);
        out[gk] = checked ? (checked.value || 'on') : '';
      } else {
        const values = g.inputs.filter(i => i.checked).map(i => i.value || 'on');
        if (g.inputs.length === 1) {
          out[gk] = g.inputs[0].checked; // boolean para checkbox único
        } else {
          out[gk] = values; // array para múltiples
        }
      }
    });

    return out;
  }

  function saveFormState(form) {
    try {
      const raw = collectRaw(form);
      const norm = collectNormalized(form);
      sessionStorage.setItem(FORM_KEY_RAW, JSON.stringify(raw));
      sessionStorage.setItem(FORM_KEY, JSON.stringify(norm));
    } catch (e) {
      console.warn('saveFormState', e);
    }
  }

  function restoreFormState(form) {
    try {
      const normStr = sessionStorage.getItem(FORM_KEY);
      const rawStr = sessionStorage.getItem(FORM_KEY_RAW);

      if (normStr) {
        const norm = JSON.parse(normStr);
        Array.from(form.querySelectorAll('input, select, textarea')).forEach(el => {
          const nameKey = (el.name || '').trim();
          const idKey = (el.id ? `#${el.id}` : '');
          const t = (el.type || '').toLowerCase();

          let val;
          if (nameKey && Object.prototype.hasOwnProperty.call(norm, nameKey)) val = norm[nameKey];
          else if (idKey && Object.prototype.hasOwnProperty.call(norm, idKey)) val = norm[idKey];
          else return;

          if (t === 'radio') {
            el.checked = (el.value || 'on') === String(val);
          } else if (t === 'checkbox') {
            if (Array.isArray(val)) {
              el.checked = val.includes(el.value || 'on');
            } else if (typeof val === 'boolean') {
              el.checked = val;
            } else {
              el.checked = (el.value || 'on') === String(val);
            }
          } else if (t !== 'file') {
            el.value = val;
          }
        });
      } else if (rawStr) {
        const data = JSON.parse(rawStr);
        Array.from(form.querySelectorAll('input, select, textarea')).forEach(el => {
          const k = keyOf(el);
          if (!k) return;
          const t = (el.type || '').toLowerCase();

          if (t === 'checkbox' || t === 'radio') {
            const key = k + '::' + (el.id || '');
            if (key in data) el.checked = !!data[key];
          } else if (t !== 'file') {
            if (k in data) el.value = data[k];
          }
        });
      }

      // Disparar eventos para recalcular dependencias
      Array.from(form.querySelectorAll('input, select, textarea')).forEach(el => {
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
    } catch (e) {
      console.warn('restoreFormState', e);
    }
  }

  // Construir querystring desde el JSON normalizado
  function buildQueryFromForm(form) {
    const norm = collectNormalized(form);
    const params = new URLSearchParams();

    Object.entries(norm).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      if (Array.isArray(v)) {
        v.forEach(val => params.append(k, String(val)));
      } else {
        params.append(k, String(v));
      }
    });

    return params;
  }

  // ---------- IndexedDB para imágenes ----------

  const IDB = (function () {
    const DB_NAME = 'ds160-images-v1';
    const STORE = 'images';

    function open() {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) {
            const os = db.createObjectStore(STORE, { keyPath: 'id' });
            os.createIndex('createdAt', 'createdAt', { unique: false });
            os.createIndex('name', 'name', { unique: false });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }

    function withStore(mode, fn) {
      return open().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const store = tx.objectStore(STORE);
        let res;
        try {
          res = fn(store, tx);
        } catch (err) { reject(err); return; }
        tx.oncomplete = () => resolve(res);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
      }));
    }

    function putFile(file) {
      const id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now() + Math.random());
      const rec = {
        id,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        createdAt: Date.now(),
        blob: file
      };
      return withStore('readwrite', store => store.put(rec)).then(() => rec.id);
    }

    function listAll() {
      return withStore('readonly', (store) => new Promise((resolve, reject) => {
        const items = [];
        const req = store.openCursor();
        req.onsuccess = e => {
          const cursor = e.target.result;
          if (cursor) { items.push(cursor.value); cursor.continue(); }
          else {
            items.sort((a, b) => b.createdAt - a.createdAt);
            resolve(items);
          }
        };
        req.onerror = () => reject(req.error);
      }));
    }

    function getById(id) {
      return withStore('readonly', store => store.get(id));
    }

    function remove(id) {
      return withStore('readwrite', store => store.delete(id));
    }

    return { putFile, listAll, getById, remove };
  })();

  function formatBytes(bytes) {
    if (!bytes && bytes !== 0) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    const val = bytes / Math.pow(k, i);
    return `${val.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
  }

  function formatDate(ts) {
    try { return new Date(ts).toLocaleString(); } catch { return ''; }
  }

  async function updateImagesMetaCache() {
    try {
      const items = await IDB.listAll();
      const meta = items.map(({ id, name, size, type, createdAt }) => ({ id, name, size, type, createdAt }));
      sessionStorage.setItem(IMAGES_META_KEY, JSON.stringify(meta));
    } catch {}
  }

  // ---------- reglas UI ----------

  safe(() => {
    const form = document.getElementById('ds160-personal1');
    if (!form) return;

    // Forzar "No" en Otros nombres y ocultar bloque
    const otherNamesN = document.getElementById('OtherNamesN');
    if (otherNamesN) {
      otherNamesN.checked = true;
      otherNamesN.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const otherLabel = Array.from(document.querySelectorAll('label')).find(l =>
      /¿Ha utilizado otros nombres\?/i.test(l.textContent || '')
    );
    if (otherLabel) {
      const r = otherLabel.closest('.row') || otherLabel.parentElement;
      if (r) hide(r);
    }

    // Forzar "No" en Telecódigo y ocultar bloque
    const telecodeN = document.getElementById('TelecodeN');
    if (telecodeN) {
      telecodeN.checked = true;
      telecodeN.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const teleLabel = Array.from(document.querySelectorAll('label')).find(l =>
      /telecódigo/i.test(l.textContent || '')
    );
    if (teleLabel) {
      const r = teleLabel.closest('.row') || teleLabel.parentElement;
      if (r) hide(r);
    }

    // Nombres / Apellidos
    const given = document.getElementById('APP_GIVEN_NAME');
    const surname = document.getElementById('APP_SURNAME');

    // Campo "Nombre completo / Nombre nativo"
    const fullNative = document.getElementById('APP_FULL_NAME_NATIVE');
    if (fullNative) {
      const row = fullNative.closest('.row') || document.getElementById('row_full_name_native');

      const updateFull = () => {
        const g = given && given.value ? given.value.trim() : '';
        const s = surname && surname.value ? surname.value.trim() : '';
        fullNative.value = [g, s].filter(Boolean).join(' ').trim();
      };

      if (given) {
        given.addEventListener('input', updateFull);
        given.addEventListener('change', updateFull);
      }
      if (surname) {
        surname.addEventListener('input', updateFull);
        surname.addEventListener('change', updateFull);
      }
      updateFull();

      // ocultar sólo la casilla "No aplica / tecnología no disponible"
      const naCheckbox = document.getElementById('APP_FULL_NAME_NATIVE_NA');
      if (naCheckbox) {
        naCheckbox.checked = false;
        naCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
        const naContainer =
          naCheckbox.closest('.inline') ||
          (document.querySelector('label[for="APP_FULL_NAME_NATIVE_NA"]')
            ? document.querySelector('label[for="APP_FULL_NAME_NATIVE_NA"]').parentElement
            : null);
        if (naContainer) hide(naContainer);
      }

      // ocultar el campo de "Nombre completo / Nombre nativo"
      if (row) hide(row);
    }

    // Estado / Provincia visible
    const state = document.getElementById('POB_STATE');
    if (state) {
      const stateRow = state.closest('.row');
      if (stateRow) show(stateRow);

      // ocultar sólo la casilla "No aplica" del estado
      const naBox = document.getElementById('POB_STATE_NA');
      if (naBox) {
        naBox.checked = false;
        naBox.dispatchEvent(new Event('change', { bubbles: true }));

        const naContainer =
          naBox.closest('.inline') ||
          (document.querySelector('label[for="POB_STATE_NA"]')
            ? document.querySelector('label[for="POB_STATE_NA"]').parentElement
            : null);
        if (naContainer) hide(naContainer);

        const naLabel = document.querySelector('label[for="POB_STATE_NA"]');
        if (naLabel) {
          const parent = naLabel.closest('.row') || naLabel.parentElement;
          if (parent && parent !== stateRow) hide(parent);
        }
      }
    }

    // País de nacimiento: dejar MÉXICO seleccionado si está disponible
    const setMexicoOn = sel => {
      if (!sel) return;
      const mxOpt = Array.from(sel.options).find(o => {
        const t = (o.text || '').trim().toUpperCase();
        return t === 'MÉXICO' || t === 'MEXICO';
      });
      if (mxOpt) {
        sel.value = mxOpt.value !== '' ? mxOpt.value : mxOpt.text;
      }
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const visibleCountry = document.getElementById('POB_COUNTRY_VISIBLE');
    if (visibleCountry) {
      setMexicoOn(visibleCountry);
      const crow = visibleCountry.closest('.row');
      if (crow) show(crow);
    }

    const hiddenCountry = document.getElementById('POB_COUNTRY');
    if (hiddenCountry) {
      setMexicoOn(hiddenCountry);
      const cont =
        hiddenCountry.closest('.row') ||
        document.getElementById('row_pob_country_container');
      if (cont && cont.classList && cont.classList.contains('hide-red')) hide(cont);
    }

    // NO ocultar fieldset "Imágenes" (visible y funcional)
    Array.from(document.querySelectorAll('fieldset')).forEach(fs => {
      const legend = fs.querySelector('legend');
      if (legend && /Imágenes/i.test(legend.textContent || '')) {
        show(fs);
      }
    });

    // Traducción de selects visibles
    const gender = document.getElementById('APP_GENDER');
    if (gender) {
      gender.innerHTML =
        '<option value="">- Seleccione -</option>' +
        '<option value="MALE">Masculino</option>' +
        '<option value="FEMALE">Femenino</option>';
    }

    const ms = document.getElementById('APP_MARITAL_STATUS');
    if (ms) {
      ms.innerHTML = [
        '<option value="">- Seleccione -</option>',
        '<option value="MARRIED">Casado(a)</option>',
        '<option value="COMMON LAW MARRIAGE">Unión de hecho</option>',
        '<option value="CIVIL UNION/DOMESTIC PARTNERSHIP">Unión civil/pareja doméstica</option>',
        '<option value="SINGLE">Soltero(a)</option>',
        '<option value="WIDOWED">Viudo(a)</option>',
        '<option value="DIVORCED">Divorciado(a)</option>',
        '<option value="LEGALLY SEPARATED">Separado(a) legalmente</option>',
        '<option value="OTHER">Otro</option>'
      ].join('');
    }
  });

  // ---------- restaurar estado guardado ----------

  safe(() => {
    const form = document.getElementById('ds160-personal1');
    if (form) restoreFormState(form);
  });

  // ---------- sección Imágenes: lógica ----------

  safe(() => {
    const input = document.getElementById('imagesNow');
    const uploadBtn = document.getElementById('uploadBtn');
    const refreshBtn = document.getElementById('refreshListBtn');
    const listWrap = document.getElementById('imagesList');
    const prog = document.getElementById('uploadProgress');
    const progText = document.getElementById('uploadProgressText');
    const status = document.getElementById('uploadStatusImages');

    function setProgress(pct, txt) {
      if (prog) prog.value = Math.max(0, Math.min(100, pct || 0));
      if (progText) progText.textContent = txt || '';
    }

    function setStatus(msg) {
      if (status) status.textContent = msg || '';
    }

    function clearListUI() {
      if (!listWrap) return;
      listWrap.innerHTML = '<div class="muted">Sin archivos.</div>';
    }

    async function renderList() {
      if (!listWrap) return;
      const items = await IDB.listAll();
      if (!items || items.length === 0) {
        clearListUI();
        await updateImagesMetaCache();
        return;
      }
      const rows = items.map(rec => {
        return `
          <tr data-id="${rec.id}">
            <td>${escapeHtml(rec.name)}</td>
            <td>${formatBytes(rec.size)}</td>
            <td>${rec.type ? escapeHtml(rec.type) : ''}</td>
            <td>${formatDate(rec.createdAt)}</td>
            <td class="file-actions">
              <button type="button" data-action="view">Ver</button>
              <button type="button" data-action="download">Descargar</button>
              <button type="button" data-action="delete">Eliminar</button>
            </td>
          </tr>
        `;
      }).join('');

      listWrap.innerHTML = `
        <table class="files" aria-label="Archivos guardados">
          <thead>
            <tr><th>Nombre</th><th>Tamaño</th><th>Tipo</th><th>Fecha</th><th>Acciones</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `;

      await updateImagesMetaCache();
    }

    function escapeHtml(str) {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    async function handleActionClick(e) {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const tr = btn.closest('tr[data-id]');
      if (!tr) return;
      const id = tr.getAttribute('data-id');
      const action = btn.getAttribute('data-action');

      if (action === 'delete') {
        await IDB.remove(id);
        await renderList();
        setStatus('Archivo eliminado.');
        return;
      }

      if (action === 'view' || action === 'download') {
        const rec = await IDB.getById(id);
        if (!rec || !rec.blob) {
          setStatus('No se pudo abrir el archivo.');
          return;
        }
        const url = URL.createObjectURL(rec.blob);
        try {
          if (action === 'view') {
            window.open(url, '_blank', 'noopener');
          } else {
            const a = document.createElement('a');
            a.href = url;
            a.download = rec.name || 'archivo';
            document.body.appendChild(a);
            a.click();
            a.remove();
          }
        } finally {
          setTimeout(() => URL.revokeObjectURL(url), 4000);
        }
      }
    }

    if (listWrap) listWrap.addEventListener('click', handleActionClick);

    if (uploadBtn) {
      uploadBtn.addEventListener('click', async () => {
        try {
          const files = (input && input.files) ? Array.from(input.files) : [];
          if (!files.length) {
            setStatus('No hay archivos seleccionados.');
            return;
          }
          setStatus('Guardando...');
          setProgress(0, '0%');

          const total = files.length;
          let done = 0;

          for (const f of files) {
            await IDB.putFile(f);
            done += 1;
            const pct = Math.round((done / total) * 100);
            setProgress(pct, `${pct}% (${done}/${total})`);
          }

          setStatus(`Guardado: ${done} archivo(s).`);
          if (input) input.value = '';
          await renderList();
        } catch (err) {
          console.error(err);
          setStatus('Error al guardar archivos.');
        } finally {
          setTimeout(() => setProgress(0, ''), 800);
        }
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        await renderList();
        setStatus('Lista actualizada.');
      });
    }

    // Render inicial
    renderList().catch(console.warn);
  });

  // ---------- botón Limpiar ----------

  safe(() => {
    const form = document.getElementById('ds160-personal1');
    const clearBtn = document.getElementById('clearBtn');
    if (!form || !clearBtn) return;

    clearBtn.addEventListener('click', () => {
      form.reset();
      sessionStorage.removeItem(FORM_KEY);
      sessionStorage.removeItem(FORM_KEY_RAW);
      // mantener imágenes, solo se limpia el formulario
      Array.from(form.querySelectorAll('input, select, textarea')).forEach(el => {
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
  });

  // ---------- botón Siguiente ----------

  safe(() => {
    const nextBtn = document.getElementById('nextBtn');
    const form = document.getElementById('ds160-personal1');
    if (!nextBtn || !form) return;

    // bloquear submit nativo
    form.addEventListener('submit', ev => ev.preventDefault());

    nextBtn.addEventListener('click', ev => {
      ev.preventDefault();

      // 1. Quitar required de campos ocultos
      removeRequiredFromHidden(form);

      // 2. Validar requeridos visibles
      if (!isFormValid(form)) {
        alert('Faltan campos obligatorios. Revise antes de continuar.');
        return;
      }

      // 3. Guardar estado
      saveFormState(form);

      // 4. Construir params a partir del JSON normalizado
      const params = buildQueryFromForm(form);

      // 5. Navegar a personal2.html con query string
      const nextUrl = new URL(NEXT_PAGE, window.location.href);
      nextUrl.search = params.toString();

      window.location.href = nextUrl.href;
    });
  });

  // ---------- guardado periódico automático ----------

  safe(() => {
    const form = document.getElementById('ds160-personal1');
    if (!form) return;

    let lastSnapshot = '';
    setInterval(() => {
      try {
        // snapshot normalizado
        const norm = collectNormalized(form);
        const snap = JSON.stringify(norm);
        if (snap !== lastSnapshot) {
          sessionStorage.setItem(FORM_KEY, snap);
          // crudo para restauración exacta
          sessionStorage.setItem(FORM_KEY_RAW, JSON.stringify(collectRaw(form)));
          lastSnapshot = snap;
        }
      } catch (e) {
        // silencio
      }
    }, 3000);
  });

  console.info('personal1.js listo.');
});
