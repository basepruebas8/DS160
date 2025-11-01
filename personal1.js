// personal1.js
// Reemplazar el personal1.js actual por este archivo.
// - Autocompleta Nombre nativo = Nombres + Apellidos (visible).
// - Radios "Otros nombres" y "Telecódigo" = No (ocultos).
// - Oculta sólo las casillas "No aplica" (estado, nombre nativo), mantiene Estado visible.
// - Guarda/restaura en sessionStorage.
// - Al hacer Siguiente construye query string con los valores del formulario y navega a personal2.html (sin recargar la página previo envío).

document.addEventListener('DOMContentLoaded', function () {
  const FORM_KEY = 'ds160-personal1-state-v2';
  const NEXT_PAGE = 'personal2.html';
  const safe = fn => { try { fn(); } catch (e) { console.warn(e); } };
  const hide = el => { if (!el) return; el.style.display = 'none'; el.hidden = true; el.setAttribute('aria-hidden','true'); };
  const show = el => { if (!el) return; el.style.display = ''; el.hidden = false; el.removeAttribute('aria-hidden'); };

  // ---- utilidades ----
  function removeRequiredFromHidden(form) {
    Array.from(form.querySelectorAll('[required]')).forEach(el => {
      const isHidden = el.hidden || (el.closest && el.closest('[hidden]') !== null) ||
        getComputedStyle(el).display === 'none' ||
        (el.closest && el.closest('.row') && getComputedStyle(el.closest('.row')).display === 'none');
      if (isHidden) try { el.removeAttribute('required'); } catch {}
    });
  }

  function saveFormState(form) {
    try {
      const data = {};
      Array.from(form.querySelectorAll('input, select, textarea')).forEach(el => {
        if (!el.name) return;
        if (el.type === 'checkbox' || el.type === 'radio') data[el.name + '::' + (el.id || '')] = el.checked;
        else data[el.name] = el.value;
      });
      sessionStorage.setItem(FORM_KEY, JSON.stringify(data));
    } catch (e) { console.warn('saveFormState', e); }
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
    } catch (e) { console.warn('restoreFormState', e); }
  }

  // ---- reglas UI (visibilidad, valores por defecto, traducciones) ----
  safe(() => {
    const form = document.getElementById('ds160-personal1');
    if (!form) return;

    // Radios verdes -> marcar "No"
    const otherNamesN = document.getElementById('OtherNamesN');
    if (otherNamesN) { otherNamesN.checked = true; otherNamesN.dispatchEvent(new Event('change',{bubbles:true})); }
    const telecodeN = document.getElementById('TelecodeN');
    if (telecodeN) { telecodeN.checked = true; telecodeN.dispatchEvent(new Event('change',{bubbles:true})); }

    // ocultar bloques extra que dependan de esos radios (si aparecen)
    const otherLabel = Array.from(document.querySelectorAll('label')).find(l => /¿Ha utilizado otros nombres\?/i.test(l.textContent || ''));
    if (otherLabel) { const r = otherLabel.closest('.row') || otherLabel.parentElement; if (r) hide(r); }
    const teleLabel = Array.from(document.querySelectorAll('label')).find(l => /telecódigo/i.test(l.textContent || ''));
    if (teleLabel) { const r = teleLabel.closest('.row') || teleLabel.parentElement; if (r) hide(r); }

    // Nombre nativo: asegurarlo visible y autocompletar Nombres + Apellidos
    const given = document.getElementById('APP_GIVEN_NAME');
    const surname = document.getElementById('APP_SURNAME');
    const fullNative = document.getElementById('APP_FULL_NAME_NATIVE');
    if (fullNative) {
      // si existe fila oculta con clase hide-red, forzamos mostrarla
      const row = fullNative.closest('.row') || document.getElementById('row_full_name_native');
      if (row) show(row);

      const updateFull = () => {
        const g = given && given.value ? given.value.trim() : '';
        const s = surname && surname.value ? surname.value.trim() : '';
        fullNative.value = [g, s].filter(Boolean).join(' ').trim();
      };
      if (given) { given.addEventListener('input', updateFull); given.addEventListener('change', updateFull); }
      if (surname) { surname.addEventListener('input', updateFull); surname.addEventListener('change', updateFull); }
      updateFull();

      // ocultar solo el checkbox "No aplica / Tecnología no disponible" si existe
      const naCheckbox = document.getElementById('APP_FULL_NAME_NATIVE_NA');
      if (naCheckbox) {
        naCheckbox.checked = false;
        naCheckbox.dispatchEvent(new Event('change',{bubbles:true}));
        const naContainer = naCheckbox.closest('.inline') || document.querySelector('label[for="APP_FULL_NAME_NATIVE_NA"]')?.parentElement;
        if (naContainer) hide(naContainer);
      }
    }

    // Estado/Provincia: asegurar VISIBLE; ocultar únicamente su checkbox "No aplica"
    const state = document.getElementById('POB_STATE');
    if (state) {
      const stateRow = state.closest('.row');
      if (stateRow) show(stateRow);
      const naBox = document.getElementById('POB_STATE_NA');
      if (naBox) {
        naBox.checked = false;
        naBox.dispatchEvent(new Event('change',{bubbles:true}));
        const naContainer = naBox.closest('.inline') || document.querySelector('label[for="POB_STATE_NA"]')?.parentElement;
        if (naContainer) hide(naContainer);
        const naLabel = document.querySelector('label[for="POB_STATE_NA"]');
        if (naLabel) { const parent = naLabel.closest('.row') || naLabel.parentElement; if (parent && parent !== stateRow) hide(parent); }
      }
    }

    // País: preferir POB_COUNTRY_VISIBLE (si existe) y dejar seleccionado MÉXICO; si existe POB_COUNTRY también setearlo.
    const setMexicoOn = sel => {
      if (!sel) return;
      const mxOpt = Array.from(sel.options).find(o => ((o.text||'').trim().toUpperCase()) === 'MÉXICO' || ((o.text||'').trim().toUpperCase()) === 'MEXICO');
      if (mxOpt) sel.value = mxOpt.value !== '' ? mxOpt.value : mxOpt.text;
      sel.dispatchEvent(new Event('change',{bubbles:true}));
    };
    const visibleCountry = document.getElementById('POB_COUNTRY_VISIBLE');
    if (visibleCountry) {
      setMexicoOn(visibleCountry);
      // mostrar su fila por si quedó oculta
      const crow = visibleCountry.closest('.row');
      if (crow) show(crow);
    }
    const hiddenCountry = document.getElementById('POB_COUNTRY');
    if (hiddenCountry) {
      setMexicoOn(hiddenCountry);
      // si el contenedor original está marcado para oculto (hide-red), dejarlo oculto
      const cont = hiddenCountry.closest('.row') || document.getElementById('row_pob_country_container');
      if (cont && cont.classList.contains('hide-red')) hide(cont);
    }

    // Ocultar fieldset Imágenes si existe
    Array.from(document.querySelectorAll('fieldset')).forEach(fs => {
      const legend = fs.querySelector('legend');
      if (legend && /Imágenes/i.test(legend.textContent || '')) {
        // ocultar sólo si es necesario; aquí lo dejamos oculto para seguir reglas previas
        hide(fs);
      }
    });

    // Traducción de selects (texto visible; values se mantienen)
    const gender = document.getElementById('APP_GENDER');
    if (gender) gender.innerHTML = '<option value="">- Seleccione -</option><option value="MALE">Masculino</option><option value="FEMALE">Femenino</option>';
    const ms = document.getElementById('APP_MARITAL_STATUS');
    if (ms) ms.innerHTML = [
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
  });

  // ---- restaurar estado al cargar ----
  safe(() => {
    const form = document.getElementById('ds160-personal1');
    if (form) restoreFormState(form);
  });

  // ---- Siguiente: construir query con FormData y navegar a personal2.html ----
  safe(() => {
    const nextBtn = document.getElementById('nextBtn');
    const form = document.getElementById('ds160-personal1');
    if (!nextBtn || !form) return;

    // prevenir submit nativo
    form.addEventListener('submit', ev => ev.preventDefault());

    nextBtn.addEventListener('click', ev => {
      ev.preventDefault();

      // quitar required en ocultos para que no bloquee nada
      removeRequiredFromHidden(form);

      // guardar estado antes de navegar
      saveFormState(form);

      // construir FormData y convertir a query string (incluye radios seleccionados)
      const fd = new FormData(form);

      // Asegurar que si existe POB_COUNTRY_VISIBLE y no existe POB_COUNTRY,
      // demos también valor a POB_COUNTRY (compatibilidad server)
      const visibleCountry = document.getElementById('POB_COUNTRY_VISIBLE');
      const hiddenCountry = document.getElementById('POB_COUNTRY');
      if (visibleCountry && !hiddenCountry) {
        // clonar el valor manualmente en los params más abajo
      }

      // Generar URLSearchParams desde FormData
      const params = new URLSearchParams();
      for (const pair of fd.entries()) {
        // Añadir todos los pares; si existe ya el mismo name (ej: varios checks), se acumula
        params.append(pair[0], pair[1]);
      }

      // Si existe POB_COUNTRY_VISIBLE y no existe POB_COUNTRY en params, añadir POB_COUNTRY con mismo valor
      if (visibleCountry) {
        const visibleName = visibleCountry.name || 'POB_COUNTRY_VISIBLE';
        const visibleVal = visibleCountry.value || '';
        // si no hay POB_COUNTRY en params, setear ambos
        if (!params.has('POB_COUNTRY')) params.set('POB_COUNTRY', visibleVal);
        // asegurar también el campo visible se mantiene
        if (!params.has(visibleName)) params.set(visibleName, visibleVal);
      }

      // Navegar a personal2.html con query string (relativa a la ubicación actual)
      const nextUrl = new URL(NEXT_PAGE, window.location.href);
      nextUrl.search = params.toString();

      // navegar (esto reemplaza la página actual y mantiene el historial)
      window.location.href = nextUrl.href;
    });
  });

  // ---- guardado periódico automático (evita pérdidas) ----
  safe(() => {
    const form = document.getElementById('ds160-personal1');
    if (!form) return;
    let lastSnapshot = '';
    setInterval(() => {
      try {
        const values = {};
        Array.from(form.querySelectorAll('input, select, textarea')).forEach(el => {
          if (!el.name) return;
          if (el.type === 'checkbox' || el.type === 'radio') values[el.name + '::' + (el.id || '')] = el.checked;
          else values[el.name] = el.value;
        });
        const snap = JSON.stringify(values);
        if (snap !== lastSnapshot) {
          sessionStorage.setItem(FORM_KEY, snap);
          lastSnapshot = snap;
        }
      } catch (e) {}
    }, 3000);
  });

  console.info('personal1.js listo: autocompleta, ocultamientos, guardado y navegación a personal2.html con query string.');
});
