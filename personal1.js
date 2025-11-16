// personal1.js
// Lógica de navegación, limpieza e imágenes para personal1.html
// Usa el mismo JSON que form-data.js (localStorage['ds160_data']).

(function () {
  'use strict';

  const STORAGE_KEY = 'ds160_data';
  const IMAGES_PROP = 'personal1_images';

  function readStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.error('Error leyendo ds160_data', e);
      return {};
    }
  }

  function writeStore(obj) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj || {}));
    } catch (e) {
      console.error('Error guardando ds160_data', e);
    }
  }

  function formatSize(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let u = 0;
    let value = bytes;
    while (value >= 1024 && u < units.length - 1) {
      value = value / 1024;
      u++;
    }
    return value.toFixed(u === 0 ? 0 : 1) + ' ' + units[u];
  }

  function renderImagesList(container) {
    if (!container) return;

    const data = readStore();
    const list = Array.isArray(data[IMAGES_PROP]) ? data[IMAGES_PROP] : [];

    container.innerHTML = '';

    if (!list.length) {
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.textContent = 'Sin archivos.';
      container.appendChild(empty);
      return;
    }

    const table = document.createElement('table');
    table.className = 'files';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['Nombre', 'Tamaño', 'Tipo'].forEach((txt) => {
      const th = document.createElement('th');
      th.textContent = txt;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    list.forEach((f) => {
      const tr = document.createElement('tr');

      const tdName = document.createElement('td');
      tdName.textContent = f.name || '';
      tr.appendChild(tdName);

      const tdSize = document.createElement('td');
      tdSize.textContent = formatSize(f.size || 0);
      tr.appendChild(tdSize);

      const tdType = document.createElement('td');
      tdType.textContent = f.type || '';
      tr.appendChild(tdType);

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    container.appendChild(table);
  }

  function savePageFieldsToJson(form) {
    if (!form) return;
    const fields = form.querySelectorAll('input[name], select[name], textarea[name]');
    fields.forEach((field) => {
      field.dispatchEvent(new Event('change', { bubbles: true }));
      field.dispatchEvent(new Event('blur', { bubbles: true }));
    });
  }

  function clearPageFieldsFromJson(form) {
    const data = readStore();
    if (!form) {
      writeStore(data);
      return;
    }
    const fields = form.querySelectorAll('input[name], select[name], textarea[name]');
    fields.forEach((field) => {
      if (!field.name) return;
      if (Object.prototype.hasOwnProperty.call(data, field.name)) {
        delete data[field.name];
      }
    });
    if (Object.prototype.hasOwnProperty.call(data, IMAGES_PROP)) {
      delete data[IMAGES_PROP];
    }
    writeStore(data);
  }

  function toggleNativeName(nativeInput, nativeNaCheckbox) {
    if (!nativeInput || !nativeNaCheckbox) return;
    const update = () => {
      if (nativeNaCheckbox.checked) {
        nativeInput.disabled = true;
        nativeInput.value = '';
        nativeInput.required = false;
        nativeInput.setCustomValidity('');
      } else {
        nativeInput.disabled = false;
        nativeInput.required = true;
      }
    };
    nativeNaCheckbox.addEventListener('change', update);
    update();
  }

  function toggleTelecodeSection(yesRadio, noRadio, section, teleSurname, teleGiven) {
    const update = () => {
      const show = !!(yesRadio && yesRadio.checked);
      if (section) {
        section.hidden = !show;
        section.style.display = show ? '' : 'none';
        if (show) {
          section.removeAttribute('aria-hidden');
        } else {
          section.setAttribute('aria-hidden', 'true');
        }
      }
      if (teleSurname) {
        teleSurname.required = show;
        if (!show) {
          teleSurname.value = '';
          teleSurname.setCustomValidity('');
        }
      }
      if (teleGiven) {
        teleGiven.required = show;
        if (!show) {
          teleGiven.value = '';
          teleGiven.setCustomValidity('');
        }
      }
    };
    if (yesRadio) yesRadio.addEventListener('change', update);
    if (noRadio)  noRadio.addEventListener('change', update);
    update();
  }

  function togglePobState(stateInput, naCheckbox) {
    if (!stateInput || !naCheckbox) return;
    const update = () => {
      if (naCheckbox.checked) {
        stateInput.disabled = true;
        stateInput.value = '';
        stateInput.required = false;
        stateInput.setCustomValidity('');
      } else {
        stateInput.disabled = false;
        stateInput.required = true;
      }
    };
    naCheckbox.addEventListener('change', update);
    update();
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('ds160-personal1');
    if (!form) return;

    const NEXT_URL = new URL('personal2.html', window.location.href).href;

    const clearBtn = document.getElementById('clearBtn');
    const nextBtn  = document.getElementById('nextBtn');
    const saveMsg  = document.getElementById('saveMsg');

    const nativeName   = document.getElementById('APP_FULL_NAME_NATIVE');
    const nativeNameNA = document.getElementById('APP_FULL_NAME_NATIVE_NA');

    const telecodeY       = document.getElementById('TelecodeY');
    const telecodeN       = document.getElementById('TelecodeN');
    const telecodeSection = document.getElementById('telecodeSection');
    const telecodeSurname = document.getElementById('TELECODE_SURNAME');
    const telecodeGiven   = document.getElementById('TELECODE_GIVEN');

    const pobState   = document.getElementById('POB_STATE');
    const pobStateNA = document.getElementById('POB_STATE_NA');

    const imagesInput      = document.getElementById('imagesNow');
    const uploadBtn        = document.getElementById('uploadBtn');
    const refreshListBtn   = document.getElementById('refreshListBtn');
    const uploadProgress   = document.getElementById('uploadProgress');
    const uploadProgressText = document.getElementById('uploadProgressText');
    const uploadStatus     = document.getElementById('uploadStatusImages');
    const imagesList       = document.getElementById('imagesList');

    if (nextBtn) {
      nextBtn.disabled = false;
      nextBtn.removeAttribute('aria-disabled');
    }

    toggleNativeName(nativeName, nativeNameNA);
    toggleTelecodeSection(telecodeY, telecodeN, telecodeSection, telecodeSurname, telecodeGiven);
    togglePobState(pobState, pobStateNA);

    renderImagesList(imagesList);

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        form.reset();
        clearPageFieldsFromJson(form);
        renderImagesList(imagesList);

        if (uploadProgress)     uploadProgress.value = 0;
        if (uploadProgressText) uploadProgressText.textContent = '';
        if (uploadStatus)       uploadStatus.textContent = '';

        if (saveMsg) saveMsg.textContent = 'Formulario limpiado.';
      });
    }

    if (uploadBtn && imagesInput && imagesList) {
      uploadBtn.addEventListener('click', () => {
        const files = Array.from(imagesInput.files || []);
        if (!files.length) {
          if (uploadStatus) uploadStatus.textContent = 'No hay archivos seleccionados.';
          return;
        }

        const data    = readStore();
        const current = Array.isArray(data[IMAGES_PROP]) ? data[IMAGES_PROP] : [];
        const mapped  = files.map((f) => ({
          name: f.name,
          size: f.size,
          type: f.type || '',
          lastModified: f.lastModified || Date.now()
        }));
        data[IMAGES_PROP] = current.concat(mapped);
        writeStore(data);

        if (uploadProgress)     uploadProgress.value = 100;
        if (uploadProgressText) uploadProgressText.textContent = '100%';
        if (uploadStatus)       uploadStatus.textContent = 'Imágenes guardadas localmente.';

        renderImagesList(imagesList);
      });
    }

    if (refreshListBtn && imagesList) {
      refreshListBtn.addEventListener('click', () => {
        renderImagesList(imagesList);
        if (uploadStatus) uploadStatus.textContent = 'Lista actualizada.';
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (!form.checkValidity()) {
          form.reportValidity();
          const firstInvalid = form.querySelector(':invalid');
          if (firstInvalid && firstInvalid.scrollIntoView) {
            firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return;
        }

        // aseguramos que todo se vaya al JSON global
        savePageFieldsToJson(form);

        if (saveMsg) {
          saveMsg.textContent = 'Datos guardados. Redirigiendo…';
        }

        window.location.assign(NEXT_URL);
      });
    }
  });
})();
