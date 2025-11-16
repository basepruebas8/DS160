// personal1.js
// Lógica de navegación, validación y almacenamiento local para personal1.html

(function () {
  'use strict';

  const DS160_STORAGE_KEY = 'ds160_data';
  const IMAGES_PROP = 'personal1_images';

  function setSectionVisible(el, visible) {
    if (!el) return;
    if (visible) {
      el.style.display = '';
      el.hidden = false;
      el.removeAttribute('aria-hidden');
    } else {
      el.style.display = 'none';
      el.hidden = true;
      el.setAttribute('aria-hidden', 'true');
    }
  }

  function humanFileSize(bytes) {
    const thresh = 1024;
    if (!Number.isFinite(bytes) || bytes < 0) return '';
    if (bytes < thresh) return bytes + ' B';
    const units = ['KB', 'MB', 'GB', 'TB'];
    let u = -1;
    let value = bytes;
    do {
      value /= thresh;
      ++u;
    } while (value >= thresh && u < units.length - 1);
    return value.toFixed(1) + ' ' + units[u];
  }

  function loadDs160Data() {
    try {
      const raw = localStorage.getItem(DS160_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.error('Error leyendo ds160_data', e);
      return {};
    }
  }

  function saveDs160Data(data) {
    try {
      localStorage.setItem(DS160_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Error guardando ds160_data', e);
    }
  }

  function renderImagesList(container, images) {
    if (!container) return;

    container.innerHTML = '';

    if (!images || images.length === 0) {
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
    images.forEach((f) => {
      const tr = document.createElement('tr');

      const tdName = document.createElement('td');
      tdName.textContent = f.name || '';
      tr.appendChild(tdName);

      const tdSize = document.createElement('td');
      tdSize.textContent = humanFileSize(f.size || 0);
      tr.appendChild(tdSize);

      const tdType = document.createElement('td');
      tdType.textContent = f.type || '';
      tr.appendChild(tdType);

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    container.appendChild(table);
  }

  function refreshImagesFromStorage(container) {
    const data = loadDs160Data();
    const list = Array.isArray(data[IMAGES_PROP]) ? data[IMAGES_PROP] : [];
    renderImagesList(container, list);
  }

  function saveAllFieldsForFormPersistence(form) {
    if (!form) return;
    const fields = form.querySelectorAll('input[name], select[name], textarea[name]');
    fields.forEach((field) => {
      field.dispatchEvent(new Event('change', { bubbles: true }));
      field.dispatchEvent(new Event('blur', { bubbles: true }));
    });
  }

  function normalizeDobYear(dobYear) {
    if (!dobYear) return;
    const digits = dobYear.value.replace(/\D/g, '').slice(0, 4);
    dobYear.value = digits;
    dobYear.setCustomValidity('');
    if (digits && digits.length !== 4) {
      dobYear.setCustomValidity('Ingrese un año de 4 dígitos.');
    }
  }

  function monthCodeToNumber(code) {
    if (!code) return 0;
    const map = {
      JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
      JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12
    };
    return map[code.toUpperCase()] || 0;
  }

  function validateDobGroup(dobDay, dobMonth, dobYear) {
    if (!dobDay || !dobMonth || !dobYear) return true;

    dobDay.setCustomValidity('');
    dobMonth.setCustomValidity('');
    dobYear.setCustomValidity('');

    const d = dobDay.value;
    const m = dobMonth.value;
    const y = dobYear.value;

    if (!d || !m || !y) {
      // Los required ya marcan vacío; aquí marcamos incompleto.
      if (d || m || y) {
        dobYear.setCustomValidity('Fecha incompleta.');
        return false;
      }
      return true;
    }

    if (y.length !== 4) {
      dobYear.setCustomValidity('Año inválido.');
      return false;
    }

    const dayNum = parseInt(d, 10);
    const monthNum = monthCodeToNumber(m);
    const yearNum = parseInt(y, 10);

    if (!Number.isFinite(dayNum) || !Number.isFinite(yearNum) || monthNum === 0) {
      dobYear.setCustomValidity('Fecha inválida.');
      return false;
    }

    const date = new Date(yearNum, monthNum - 1, dayNum);
    if (
      date.getFullYear() !== yearNum ||
      date.getMonth() !== monthNum - 1 ||
      date.getDate() !== dayNum
    ) {
      dobYear.setCustomValidity('Fecha inválida.');
      return false;
    }

    return true;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('ds160-personal1');
    if (!form) return;

    const NEXT_URL = new URL('personal2.html', window.location.href).href;

    const nextBtn = document.getElementById('nextBtn');
    const clearBtn = document.getElementById('clearBtn');
    const saveMsg = document.getElementById('saveMsg');

    const nativeName = document.getElementById('APP_FULL_NAME_NATIVE');
    const nativeNameNA = document.getElementById('APP_FULL_NAME_NATIVE_NA');

    const telecodeY = document.getElementById('TelecodeY');
    const telecodeN = document.getElementById('TelecodeN');
    const telecodeSection = document.getElementById('telecodeSection');
    const telecodeSurname = document.getElementById('TELECODE_SURNAME');
    const telecodeGiven = document.getElementById('TELECODE_GIVEN');

    const pobState = document.getElementById('POB_STATE');
    const pobStateNA = document.getElementById('POB_STATE_NA');

    const dobDay = document.getElementById('DOB_DAY');
    const dobMonth = document.getElementById('DOB_MONTH');
    const dobYear = document.getElementById('DOB_YEAR');

    const imagesInput = document.getElementById('imagesNow');
    const uploadBtn = document.getElementById('uploadBtn');
    const refreshListBtn = document.getElementById('refreshListBtn');
    const uploadProgress = document.getElementById('uploadProgress');
    const uploadProgressText = document.getElementById('uploadProgressText');
    const uploadStatus = document.getElementById('uploadStatusImages');
    const imagesList = document.getElementById('imagesList');

    function updateNativeNameState() {
      if (!nativeName || !nativeNameNA) return;
      const na = nativeNameNA.checked;
      nativeName.disabled = na;
      nativeName.required = !na;
      if (na) {
        nativeName.value = '';
        nativeName.setCustomValidity('');
      }
    }

    function updateTelecodeSection() {
      const yes = telecodeY && telecodeY.checked;
      setSectionVisible(telecodeSection, !!yes);

      if (telecodeSurname) {
        telecodeSurname.required = !!yes;
        if (!yes) {
          telecodeSurname.value = '';
          telecodeSurname.setCustomValidity('');
        }
      }
      if (telecodeGiven) {
        telecodeGiven.required = !!yes;
        if (!yes) {
          telecodeGiven.value = '';
          telecodeGiven.setCustomValidity('');
        }
      }
    }

    function updatePobState() {
      if (!pobState || !pobStateNA) return;
      const na = pobStateNA.checked;
      pobState.disabled = na;
      pobState.required = !na;
      if (na) {
        pobState.value = '';
        pobState.setCustomValidity('');
      }
    }

    if (nativeNameNA) {
      nativeNameNA.addEventListener('change', updateNativeNameState);
    }
    if (telecodeY) {
      telecodeY.addEventListener('change', updateTelecodeSection);
    }
    if (telecodeN) {
      telecodeN.addEventListener('change', updateTelecodeSection);
    }
    if (pobStateNA) {
      pobStateNA.addEventListener('change', updatePobState);
    }

    if (dobYear) {
      dobYear.addEventListener('input', () => normalizeDobYear(dobYear));
      dobYear.addEventListener('blur', () => {
        normalizeDobYear(dobYear);
        validateDobGroup(dobDay, dobMonth, dobYear);
      });
    }
    if (dobDay) {
      dobDay.addEventListener('change', () => validateDobGroup(dobDay, dobMonth, dobYear));
    }
    if (dobMonth) {
      dobMonth.addEventListener('change', () => validateDobGroup(dobDay, dobMonth, dobYear));
    }

    // Estado inicial al cargar (después de que form-data.js restaure valores)
    updateNativeNameState();
    updateTelecodeSection();
    updatePobState();
    validateDobGroup(dobDay, dobMonth, dobYear);

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        form.reset();
        updateNativeNameState();
        updateTelecodeSection();
        updatePobState();
        if (dobYear) {
          normalizeDobYear(dobYear);
        }

        if (uploadProgress) uploadProgress.value = 0;
        if (uploadProgressText) uploadProgressText.textContent = '';
        if (uploadStatus) uploadStatus.textContent = '';
        renderImagesList(imagesList, []);

        try {
          if (window.FormPersistence && typeof window.FormPersistence.clear === 'function') {
            window.FormPersistence.clear();
          } else {
            localStorage.removeItem(DS160_STORAGE_KEY);
          }
        } catch (e) {
          console.error('Error limpiando almacenamiento', e);
        }

        if (saveMsg) {
          saveMsg.textContent = 'Formulario limpiado.';
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (dobYear) {
          normalizeDobYear(dobYear);
        }
        const dobOk = validateDobGroup(dobDay, dobMonth, dobYear);

        if (!form.checkValidity() || !dobOk) {
          form.reportValidity();
          const firstInvalid = form.querySelector(':invalid');
          if (firstInvalid) {
            firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return;
        }

        // Dispara change/blur para que form-data.js actualice ds160_data
        saveAllFieldsForFormPersistence(form);

        if (saveMsg) {
          saveMsg.textContent = 'Datos guardados. Redirigiendo…';
        }

        window.location.assign(NEXT_URL);
      });
    }

    if (uploadBtn && imagesInput && imagesList) {
      uploadBtn.addEventListener('click', () => {
        const files = Array.from(imagesInput.files || []);
        if (!files.length) {
          if (uploadStatus) uploadStatus.textContent = 'No hay archivos seleccionados.';
          return;
        }

        if (uploadProgress) uploadProgress.value = 0;
        if (uploadProgressText) uploadProgressText.textContent = 'Guardando…';
        if (uploadStatus) uploadStatus.textContent = '';

        let progress = 0;
        const step = 25;
        const timer = setInterval(() => {
          progress += step;
          const value = Math.min(progress, 100);
          if (uploadProgress) uploadProgress.value = value;
          if (uploadProgressText) uploadProgressText.textContent = value + '%';

          if (progress >= 100) {
            clearInterval(timer);

            const data = loadDs160Data();
            const current = Array.isArray(data[IMAGES_PROP]) ? data[IMAGES_PROP] : [];
            const mapped = files.map((f) => ({
              name: f.name,
              size: f.size,
              type: f.type || '',
              lastModified: f.lastModified || Date.now()
            }));
            data[IMAGES_PROP] = current.concat(mapped);
            saveDs160Data(data);

            refreshImagesFromStorage(imagesList);

            if (uploadStatus) uploadStatus.textContent = 'Imágenes registradas localmente.';
          }
        }, 120);
      });
    }

    if (refreshListBtn && imagesList) {
      refreshListBtn.addEventListener('click', () => {
        refreshImagesFromStorage(imagesList);
        if (uploadStatus) {
          uploadStatus.textContent = 'Lista actualizada.';
        }
      });
    }

    if (imagesList) {
      refreshImagesFromStorage(imagesList);
    }
  });
})();
