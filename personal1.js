// personal1.js
// Reemplazar el personal1.js actual por este archivo.
// - Mantiene las reglas de visibilidad y autocompletado previas.
// - Añade un manejador fiable para el botón "Siguiente" que envía el formulario
//   incluso si no existen los handlers originales.

document.addEventListener('DOMContentLoaded', function () {
  const safe = fn => { try { fn(); } catch (e) { console.warn(e); } };
  const hide = el => { if (!el) return; el.style.display = 'none'; el.hidden = true; el.setAttribute('aria-hidden','true'); };
  const show = el => { if (!el) return; el.style.display = ''; el.hidden = false; el.removeAttribute('aria-hidden'); };

  // --- 1) Reglas UI previas (radios = No, ocultamientos, autocompletado) ---
  safe(() => {
    // Radios verdes -> No y ocultar bloques
    const otherNamesN = document.getElementById('OtherNamesN');
    if (otherNamesN) { otherNamesN.checked = true; otherNamesN.dispatchEvent(new Event('change',{bubbles:true})); }
    const telecodeN = document.getElementById('TelecodeN');
    if (telecodeN) { telecodeN.checked = true; telecodeN.dispatchEvent(new Event('change',{bubbles:true})); }

    const otherLabel = Array.from(document.querySelectorAll('label')).find(l => /¿Ha utilizado otros nombres\?/i.test(l.textContent));
    if (otherLabel) { const r = otherLabel.closest('.row') || otherLabel.parentElement; if (r) hide(r); }
    else { const otherSection = document.getElementById('otherNamesSection'); if (otherSection) hide(otherSection); }

    const teleLabel = Array.from(document.querySelectorAll('label')).find(l => /telecódigo/i.test(l.textContent));
    if (teleLabel) { const r = teleLabel.closest('.row') || teleLabel.parentElement; if (r) hide(r); }
    else { const teleSection = document.getElementById('telecodeSection'); if (teleSection) hide(teleSection); }

    // Nombre nativo: visible y autocompletar Nombres + Apellidos
    const given = document.getElementById('APP_GIVEN_NAME');
    const surname = document.getElementById('APP_SURNAME');
    const fullNative = document.getElementById('APP_FULL_NAME_NATIVE');

    function updateFull() {
      if (!fullNative) return;
      const g = given && given.value ? given.value.trim() : '';
      const s = surname && surname.value ? surname.value.trim() : '';
      fullNative.value = [g, s].filter(Boolean).join(' ').trim();
    }
    if (fullNative) {
      const r = fullNative.closest('.row');
      if (r) show(r);
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

    // País/Región: poner MÉXICO por defecto y ocultar la fila + help
    const country = document.getElementById('POB_COUNTRY');
    if (country) {
      const mxOpt = Array.from(country.options).find(o => ((o.text||'').trim().toUpperCase()) === 'MÉXICO' || ((o.text||'').trim().toUpperCase()) === 'MEXICO');
      if (mxOpt) country.value = mxOpt.value !== '' ? mxOpt.value : mxOpt.text;
      country.dispatchEvent(new Event('change',{bubbles:true}));
      const cRow = country.closest('.row') || country.parentElement;
      if (cRow) hide(cRow);
    }
    Array.from(document.querySelectorAll('.help')).forEach(h => {
      const t = (h.textContent||'').trim();
      if (/Lista acotada a países/i.test(t) || /países del continente americano/i.test(t) || /Lista acotada/i.test(t)) hide(h);
    });
    const labelCountry = document.querySelector('label[for="POB_COUNTRY"]') || Array.from(document.querySelectorAll('label')).find(l => /País\/Región/i.test(l.textContent||''));
    if (labelCountry) { const p = labelCountry.closest('.row') || labelCountry.parentElement; if (p) hide(p); }

    // Estado/Provincia: visible; ocultar sólo la casilla "No aplica"
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

    // Ocultar fieldset Imágenes si existe
    Array.from(document.querySelectorAll('fieldset')).forEach(fs => {
      const legend = fs.querySelector('legend');
      if (legend && /Imágenes/i.test(legend.textContent)) hide(fs);
    });

    // Traducción selects (texto visible; values se mantienen)
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

  // --- 2) FIX botón "Siguiente" ---
  safe(() => {
    const nextBtn = document.getElementById('nextBtn');
    const form = document.getElementById('ds160-personal1');

    if (!nextBtn || !form) return;

    // Asegurar botón habilitado
    nextBtn.disabled = false;

    // Función que limpia required en campos ocultos (evita bloqueos de validación)
    function removeRequiredFromHidden() {
      const requiredEls = Array.from(form.querySelectorAll('[required]'));
      requiredEls.forEach(el => {
        // si el elemento está oculto por atributo hidden o display none, quitar required
        const isHidden = el.hidden || (el.closest('[hidden]') !== null) || getComputedStyle(el).display === 'none' || (el.closest && el.closest('.row') && getComputedStyle(el.closest('.row')).display === 'none');
        if (isHidden) {
          try { el.removeAttribute('required'); } catch(e){/* no bloquear */ }
        }
      });
    }

    // Intentar delegar a manejadores externos existentes (si los hubiera)
    function tryCallExternalHandlers() {
      // si existe alguna función global conocida, llamarla (conservative guess)
      const candidates = ['goNext', 'nextSection', 'goToNext', 'submitSection', 'onNext'];
      for (const name of candidates) {
        if (typeof window[name] === 'function') {
          try { window[name](); return true; } catch (e) { console.warn('error calling', name, e); }
        }
      }
      return false;
    }

    nextBtn.addEventListener('click', function (ev) {
      ev.preventDefault();
      // 1) limpiar required en ocultos
      removeRequiredFromHidden();

      // 2) si hay manejador externo conocido, intentar usarlo
      const delegated = tryCallExternalHandlers();
      if (delegated) return;

      // 3) intentar disparar 'submit' nativo: requestSubmit (respeta novalidate), fallback a submit()
      try {
        if (typeof form.requestSubmit === 'function') {
          form.requestSubmit();
        } else {
          form.submit();
        }
      } catch (e) {
        // último recurso: simular navegación forward (intento seguro: enviar evento submit para que cualquier listener lo capture)
        try {
          const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
          if (form.dispatchEvent(submitEvent)) {
            // si no fue evitado, forzamos submit
            if (typeof form.requestSubmit === 'function') form.requestSubmit();
            else form.submit();
          } else {
            console.warn('submit event cancelled by listener.');
          }
        } catch (err) {
          console.error('No se pudo avanzar: ', err);
          // no más acciones para no romper la app
        }
      }
    });
  });

  console.info('personal1.js cargado: UI ajustada y arreglado botón Siguiente.');
});
