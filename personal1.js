// personal1.js
(() => {
  const NEXT_URL = new URL('personal2.html', window.location.href).href;
  const STORAGE_PREFIX = 'ds160:';
  const FORM_ID = 'ds160-personal1';

  // ===== Helpers de almacenamiento de formulario (localStorage)
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

  // ===== UI toggles y validaciones
  function toggleSection(radioY, radioN, section, requiredEls = []) {
    const update = () => {
      const show = radioY.checked;
      section.hidden = !show;
      requiredEls.forEach(el => {
        el.required = show;
        if (!show) { el.value = ''; el.setCustomValidity(''); }
      });
    };
    [radioY, radioN].forEach(r => r.addEventListener('change', update));
    update();
    return update;
  }
  function toggleNA(textInput, checkbox) {
    const update = () => {
      if (checkbox.checked) { textInput.disabled = true; textInput.value = ''; textInput.setCustomValidity(''); }
      else { textInput.disabled = false; }
    };
    checkbox.addEventListener('change', update);
    update();
    return update;
  }
  function enforceUppercase(root) {
    root.querySelectorAll('input[data-uppercase]').forEach(inp => {
      inp.addEventListener('input', () => {
        const start = inp.selectionStart, end = inp.selectionEnd;
        inp.value = inp.value.toUpperCase();
        try { inp.setSelectionRange(start, end); } catch(e){}
      });
    });
  }

  // ===== Imágenes locales (IndexedDB) a través de DS160.imageStore
  const $ = sel => document.querySelector(sel);
  const imagesInput = $('#imagesNow');
  const uploadBtn = $('#uploadBtn');
  const refreshListBtn = $('#refreshListBtn');
  const listWrap = $('#imagesList');
  const statusEl = $('#uploadStatusImages');
  const prog = $('#uploadProgress');
  const progTxt = $('#uploadProgressText');

  async function handleSaveSelected() {
    if (!imagesInput.files || imagesInput.files.length === 0) {
      statusEl.textContent = 'Selecciona al menos un archivo.';
      return;
    }
    const files = Array.from(imagesInput.files);
    const allowed = files.filter(f => /^image\//.test(f.type));
    if (allowed.length === 0) {
      statusEl.textContent = 'Los archivos seleccionados no son imágenes.';
      return;
    }
    prog.value = 0; progTxt.textContent = '';
    statusEl.textContent = 'Guardando en local...';

    let i = 0;
    await DS160.imageStore.saveImages(allowed, (p) => {
      i = Math.round(p * 100);
      prog.value = i;
      progTxt.textContent = `${i}%`;
    });

    statusEl.textContent = `Guardado local completado (${allowed.length} archivo(s)).`;
    imagesInput.value = '';
    await renderImagesList();
  }

  async function renderImagesList() {
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

  // ===== Init
  const form = document.getElementById(FORM_ID);
  restoreForm(form);
  autosave(form);
  enforceUppercase(form);

  // Radios / secciones
  const otherY = document.getElementById('OtherNamesY');
  const otherN = document.getElementById('OtherNamesN');
  const otherSection = document.getElementById('otherNamesSection');
  const refreshOther = toggleSection(otherY, otherN, otherSection, [
    document.getElementById('OTHER_SURNAME'),
    document.getElementById('OTHER_GIVEN')
  ]);

  const teleY = document.getElementById('TelecodeY');
  const teleN = document.getElementById('TelecodeN');
  const teleSection = document.getElementById('telecodeSection');
  const refreshTele = toggleSection(teleY, teleN, teleSection, [
    document.getElementById('TELECODE_SURNAME'),
    document.getElementById('TELECODE_GIVEN')
  ]);

  const nativeName = document.getElementById('APP_FULL_NAME_NATIVE');
  const nativeNA = document.getElementById('APP_FULL_NAME_NATIVE_NA');
  const refreshNative = toggleNA(nativeName, nativeNA);

  const pobState = document.getElementById('POB_STATE');
  const pobNA = document.getElementById('POB_STATE_NA');
  const refreshPOB = toggleNA(pobState, pobNA);

  // Recalcular UI tras restaurar
  refreshOther(); refreshTele(); refreshNative(); refreshPOB();

  // Botones
  $('#clearBtn').addEventListener('click', () => {
    form.reset();
    form.querySelectorAll('input,select,textarea').forEach(el => {
      if (el.type === 'checkbox' || el.type === 'radio') {
        saveField(el);
      } else {
        el.value = '';
        saveField(el);
      }
    });
    document.getElementById('saveMsg').textContent = 'Formulario limpiado.';
    refreshOther(); refreshTele(); refreshNative(); refreshPOB();
  });

  $('#nextBtn').addEventListener('click', () => {
    if (!form.checkValidity()) {
      form.reportValidity();
      const firstInvalid = form.querySelector(':invalid');
      if (firstInvalid) firstInvalid.scrollIntoView({behavior:'smooth', block:'center'});
      return;
    }
    form.querySelectorAll('input,select,textarea').forEach(saveField);
    window.location.assign(NEXT_URL);
  });

  uploadBtn.addEventListener('click', handleSaveSelected);
  refreshListBtn.addEventListener('click', renderImagesList);
  renderImagesList();
})();
