// personal1.js
// Reemplaza el archivo actual.
// - Autocompleta el campo de nombre nativo = Nombres + Apellidos (pero ese campo queda oculto).
// - Radios "Otros nombres" y "Telecódigo" forzados a "No" y ocultos.
// - "Estado/Provincia" visible, pero se oculta sólo su casilla "No aplica".
// - Se ocultan sólo las casillas "No aplica" (estado, nombre nativo).
// - Guarda/restaura en sessionStorage.
// - Al hacer Siguiente valida que no haya campos requeridos vacíos visibles. Si falta algo, no avanza.
// - Si todo está completo: construye query string con los valores del formulario y navega a personal2.html.

document.addEventListener('DOMContentLoaded', function () {
  const FORM_KEY = 'ds160-personal1-state-v2';
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

  // Valida que todos los campos visibles marcados como required estén llenos
  // y que los grupos de radios/checkbox requeridos tengan al menos una opción marcada.
  function isFormValid(form) {
    let valid = true;
    const seenRadioNames = new Set();

    Array.from(form.querySelectorAll('[required]')).forEach(el => {
      if (isHiddenLike(el)) return; // ignorar campos ocultos

      const type = (el.type || '').toLowerCase();

      if (type === 'radio' || type === 'checkbox') {
        // validar el grupo completo una sola vez por name
        const groupName = el.name;
        if (!groupName || seenRadioNames.has(groupName)) return;
        seenRadioNames.add(groupName);

        const groupInputs = Array.from(form.querySelectorAll(`input[name="${groupName}"]`));
        const anyCheckedVisible = groupInputs.some(inputEl => {
          if (isHiddenLike(inputEl)) return false;
          return !!inputEl.checked;
        });

        if (!anyCheckedVisible) valid = false;
        return;
      }

      // text, select, textarea, date, etc.
      const value = (el.value || '').trim();
      if (value === '') {
        valid = false;
      }
    });

    return valid;
  }

  function saveFormState(form) {
    try {
      const data = {};
      Array.from(form.querySelectorAll('input, select, textarea')).forEach(el => {
        if (!el.name) return;
        if (el.type === 'checkbox' || el.type === 'radio') {
          data[el.name + '::' + (el.id || '')] = el.checked;
        } else {
          data[el.name] = el.value;
        }
      });
      sessionStorage.setItem(FORM_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('saveFormState', e);
    }
  }

  function restoreFormState(form) {
    try {
      const raw = sessionStorage.getItem(FORM_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);

      Array.from(form.querySelectorAll('input, select, textarea')).forEach(el => {
        if (!el.name) return;
        if (el.type === 'checkbox' || el.type === 'radio') {
          const key = el.name + '::' + (el.id || '');
          if (key in data) el.checked = !!data[key];
        } else {
          if (el.name in data) el.value = data[el.name];
        }

        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
    } catch (e) {
      console.warn('restoreFormState', e);
    }
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

      // IMPORTANTE: el campo de "Nombre completo / Nombre nativo" debe quedar oculto
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
      if (cont && cont.classList.contains('hide-red')) hide(cont);
    }

    // Ocultar cualquier fieldset "Imágenes"
    Array.from(document.querySelectorAll('fieldset')).forEach(fs => {
      const legend = fs.querySelector('legend');
      if (legend && /Imágenes/i.test(legend.textContent || '')) {
        hide(fs);
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

      // 4. Construir params a partir de FormData
      const fd = new FormData(form);

      const visibleCountry = document.getElementById('POB_COUNTRY_VISIBLE');
      const hiddenCountry = document.getElementById('POB_COUNTRY');

      const params = new URLSearchParams();
      for (const pair of fd.entries()) {
        params.append(pair[0], pair[1]);
      }

      // Si hay país visible pero no hay POB_COUNTRY enviado, copiar valor
      if (visibleCountry) {
        const visibleName = visibleCountry.name || 'POB_COUNTRY_VISIBLE';
        const visibleVal = visibleCountry.value || '';
        if (!params.has('POB_COUNTRY')) {
          params.set('POB_COUNTRY', visibleVal);
        }
        if (!params.has(visibleName)) {
          params.set(visibleName, visibleVal);
        }
      }

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
        const values = {};
        Array.from(form.querySelectorAll('input, select, textarea')).forEach(el => {
          if (!el.name) return;
          if (el.type === 'checkbox' || el.type === 'radio') {
            values[el.name + '::' + (el.id || '')] = el.checked;
          } else {
            values[el.name] = el.value;
          }
        });
        const snap = JSON.stringify(values);
        if (snap !== lastSnapshot) {
          sessionStorage.setItem(FORM_KEY, snap);
          lastSnapshot = snap;
        }
      } catch (e) {
        // silencio
      }
    }, 3000);
  });

  console.info(
    'personal1.js listo: autocompleta nombre oculto, radios forzados a No, estado visible sin "No aplica", guardado/restauración, validación y navegación con query string.'
  );
});
