// ds160-app.js
(() => {
  // ========= Config común (AJUSTA ESTOS VALORES) =========
  const SHARED_SECRET = 'CAMBIA_ESTE_SECRETO_LARGO_Y_UNICO'; // Debe coincidir con SECRET en Apps Script
  const NEXT_URL = new URL('personal2.html', window.location.href).href;

  // ========= Utiles DOM =========
  const $ = (sel) => document.querySelector(sel);
  const byId = (id) => document.getElementById(id);

  // ========= Helpers de almacenamiento de formulario (localStorage) =========
  const STORAGE_PREFIX = 'ds160:';
  const FORM_ID = 'ds160-personal1';

  function storageKey(field) {
    const idOrName = field.type === 'radio' ? field.name : (field.id || field.name);
    return STORAGE_PREFIX + FORM_ID + ':' + idOrName;
  }
  function saveField(field) {
    try {
      if (field.type === 'radio') {
        if (field.checked) localStorage.setItem(storageKey(field), field.value);
      } else if (field.type === 'checkbox') {
        localStorage.setItem(storageKey(field), field.checked ? '1' : '0');
      } else {
        localStorage.setItem(storageKey(field), field.value);
      }
    } catch (e) {}
  }
  function restoreField(field) {
    try {
      const key = storageKey(field);
      const v = localStorage.getItem(key);
      if (v == null) return;
      if (field.type === 'radio') {
        field.checked = (field.value === v);
      } else if (field.type === 'checkbox') {
        field.checked = (v === '1');
      } else {
        field.value = v;
      }
    } catch (e) {}
  }
  function autosave(form) {
    form.addEventListener('input', (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      if (t.matches('input,select,textarea')) saveField(t);
    }, true);
    form.addEventListener('change', (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      if (t.matches('input,select,textarea')) saveField(t);
    }, true);
  }
  function restoreForm(form) {
    const fields = form.querySelectorAll('input,select,textarea');
    fields.forEach(f => restoreField(f));
  }

  // ========= UI toggles y validaciones =========
  function toggleSection(radioY, radioN, section, requiredEls = []) {
    if (!radioY || !radioN || !section) return () => {};
    const update = () => {
      const show = radioY.checked;
      section.hidden = !show;
      requiredEls.forEach(el => {
        if (!el) return;
        el.required = show;
        if (!show) { el.value = ''; el.setCustomValidity(''); }
      });
    };
    [radioY, radioN].forEach(r => r && r.addEventListener('change', update));
    update();
    return update;
  }
  function toggleNA(textInput, checkbox) {
    if (!textInput || !checkbox) return () => {};
    const update = () => {
      if (checkbox.checked) { textInput.disabled = true; textInput.value = ''; textInput.setCustomValidity(''); }
      else { textInput.disabled = false; }
    };
    checkbox.addEventListener('change', update);
    update();
    return update;
  }
  function enforceUppercase(root) {
    if (!root) return;
    root.querySelectorAll('input[data-uppercase]').forEach(inp => {
      inp.addEventListener('input', () => {
        const start = inp.selectionStart, end = inp.selectionEnd;
        inp.value = inp.value.toUpperCase();
        try { inp.setSelectionRange(start, end); } catch(e){}
      });
    });
  }

  // ========= Bloque PERSONAL 1 (se activa si existe el formulario) =========
  (function setupPersonal1(){
    const form = byId(FORM_ID);
    if (!form) return; // La página no es personal1

    // Restaurar/Auto-guardar/Uppercase
    restoreForm(form);
    autosave(form);
    enforceUppercase(form);

    // Radios / secciones
    const otherY = byId('OtherNamesY');
    const otherN = byId('OtherNamesN');
    const otherSection = byId('otherNamesSection');
    const refreshOther = toggleSection(otherY, otherN, otherSection, [
      byId('OTHER_SURNAME'),
      byId('OTHER_GIVEN')
    ]);

    const teleY = byId('TelecodeY');
    const teleN = byId('TelecodeN');
    const teleSection = byId('telecodeSection');
    const refreshTele = toggleSection(teleY, teleN, teleSection, [
      byId('TELECODE_SURNAME'),
      byId('TELECODE_GIVEN')
    ]);

    const nativeName = byId('APP_FULL_NAME_NATIVE');
    const nativeNA = byId('APP_FULL_NAME_NATIVE_NA');
    const refreshNative = toggleNA(nativeName, nativeNA);

    const pobState = byId('POB_STATE');
    const pobNA = byId('POB_STATE_NA');
    const refreshPOB = toggleNA(pobState, pobNA);

    // Recalcular UI tras restaurar
    refreshOther(); refreshTele(); refreshNative(); refreshPOB();

    // Botones base (limpiar / siguiente)
    const saveMsg = byId('saveMsg');
    const clearBtn = byId('clearBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        form.reset();
        form.querySelectorAll('input,select,textarea').forEach(el => {
          if (el.type === 'checkbox' || el.type === 'radio') {
            saveField(el);
          } else {
            el.value = '';
            saveField(el);
          }
        });
        if (saveMsg) saveMsg.textContent = 'Formulario limpiado.';
        refreshOther(); refreshTele(); refreshNative(); refreshPOB();
      });
    }

    const nextBtn = byId('nextBtn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (!form.checkValidity()) {
          form.reportValidity();
          const firstInvalid = form.querySelector(':invalid');
          if (firstInvalid) firstInvalid.scrollIntoView({behavior:'smooth', block:'center'});
          return;
        }
        form.querySelectorAll('input,select,textarea').forEach(saveField);
        window.location.assign(NEXT_URL);
      });
    }

    // ===== Imágenes locales (IndexedDB) a través de DS160.imageStore
    const imagesInput = byId('imagesNow');
    const uploadBtn = byId('uploadBtn');
    const refreshListBtn = byId('refreshListBtn');
    const listWrap = byId('imagesList');
    const statusEl = byId('uploadStatusImages');
    const prog = byId('uploadProgress');
    const progTxt = byId('uploadProgressText');

    async function renderImagesList() {
      if (!listWrap || !window.DS160 || !DS160.imageStore || !DS160.imageStore.listImages) return;
      const items = await DS160.imageStore.listImages();
      if (!items.length) {
        listWrap.innerHTML = `<div class="muted">Sin archivos.</div>`;
        return;
      }
      const rows = items.map(r => {
        const sizeKB = (r.size/1024).toFixed(1);
        return `
          <tr data-id="${r.id}">
            <td>${r.name}</td>
            <td class="muted">${r.type || 'image/*'}</td>
            <td class="muted">${sizeKB} KB</td>
            <td>
              <button type="button" class="dl">Descargar</button>
              <button type="button" class="rm">Eliminar</button>
            </td>
          </tr>
        `;
      }).join('');
      listWrap.innerHTML = `
        <table class="files">
          <thead><tr><th>Nombre</th><th>Tipo</th><th>Tamaño</th><th>Acciones</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `;

      listWrap.querySelectorAll('button.dl').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const tr = e.currentTarget.closest('tr');
          const id = tr.getAttribute('data-id');
          const rec = await DS160.imageStore.getRecord(id);
          const blob = new Blob([rec.data], { type: rec.type || 'application/octet-stream' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = rec.name || `imagen_${id}`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        });
      });

      listWrap.querySelectorAll('button.rm').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const tr = e.currentTarget.closest('tr');
          const id = tr.getAttribute('data-id');
          await DS160.imageStore.deleteImage(id);
          await renderImagesList();
        });
      });
    }

    async function handleSaveSelected() {
      if (!imagesInput || !window.DS160 || !DS160.imageStore) return;
      if (!imagesInput.files || imagesInput.files.length === 0) {
        if (statusEl) statusEl.textContent = 'Selecciona al menos un archivo.';
        return;
      }
      const files = Array.from(imagesInput.files);
      const allowed = files.filter(f => /^image\//.test(f.type));
      if (allowed.length === 0) {
        if (statusEl) statusEl.textContent = 'Los archivos seleccionados no son imágenes.';
        return;
      }
      if (prog) prog.value = 0; if (progTxt) progTxt.textContent = '';
      if (statusEl) statusEl.textContent = 'Guardando en local...';

      let i = 0;
      await DS160.imageStore.saveImages(allowed, (p) => {
        i = Math.round(p * 100);
        if (prog) prog.value = i;
        if (progTxt) progTxt.textContent = `${i}%`;
      });

      if (statusEl) statusEl.textContent = `Guardado local completado (${allowed.length} archivo(s)).`;
      imagesInput.value = '';
      await renderImagesList();
    }

    if (uploadBtn) uploadBtn.addEventListener('click', handleSaveSelected);
    if (refreshListBtn) refreshListBtn.addEventListener('click', renderImagesList);
    renderImagesList();
  })();

  // ========= Bloque FINALIZAR/ENVIAR (Apps Script con secreto) =========
  (function setupFinalize(){
    const btnExport = byId('btnExport');
    const endpointInput = byId('endpoint');
    const btnSend = byId('btnSend');
    const statusEl = byId('status');

    // Si no hay elementos de finalización, no hacemos nada.
    if (!btnExport && !btnSend) return;

    // Descargar local
    if (btnExport) {
      btnExport.addEventListener('click', async () => {
        try {
          if (statusEl) statusEl.textContent = 'Generando JSON...';
          if (!window.DS160 || !DS160.exportAll || !DS160.downloadJSON) {
            throw new Error('DS160.exportAll()/downloadJSON() no disponible.');
          }
          const payload = await DS160.exportAll();
          DS160.downloadJSON(payload, 'DS-160.json');
          if (statusEl) statusEl.textContent = 'Descarga lista.';
        } catch (err) {
          if (statusEl) statusEl.textContent = 'Error al generar: ' + (err?.message || String(err));
        }
      });
    }

    // Enviar a Apps Script con ?key=SHARED_SECRET
    if (btnSend) {
      btnSend.addEventListener('click', async () => {
        const baseUrl = endpointInput ? endpointInput.value.trim() : '';
        if (!baseUrl) { if (statusEl) statusEl.textContent = 'Define el endpoint del Web App.'; return; }
        if (!SHARED_SECRET || SHARED_SECRET.includes('CAMBIA_')) {
          if (statusEl) statusEl.textContent = 'Configura SHARED_SECRET primero.';
          return;
        }

        let url;
        try {
          const u = new URL(baseUrl);
          if (!u.searchParams.has('key')) u.searchParams.set('key', SHARED_SECRET);
          url = u.toString();
        } catch {
          if (statusEl) statusEl.textContent = 'Endpoint inválido.';
          return;
        }

        if (statusEl) statusEl.textContent = 'Preparando y enviando...';
        try {
          if (!window.DS160 || !DS160.exportAll) {
            throw new Error('DS160.exportAll() no disponible.');
          }
          const payload = await DS160.exportAll();

          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' }, // evita preflight
            body: JSON.stringify(payload)
          });

          let data = null;
          try { data = await res.json(); } catch { /* no-op */ }

          if (!res.ok || !data || data.ok !== true) {
            const errMsg = (data && data.error) ? data.error : `HTTP ${res.status}`;
            throw new Error(errMsg);
          }

          if (statusEl) {
            const view = data.url ? ` (<a href="${data.url}" target="_blank" rel="noopener">ver en Drive</a>)` : '';
            statusEl.innerHTML = `Enviado. <code>${data.name}</code>${view}`;
          }
        } catch (err) {
          if (statusEl) statusEl.textContent = 'Error al enviar: ' + (err?.message || String(err));
        }
      });
    }
  })();
})();
