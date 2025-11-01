// personal1.js
// Reemplazar el personal1.js actual por este archivo.
// Cambios importantes:
// - Mantiene ocultamientos, autocompletado y guardado/restauración.
// - Envía por fetch y, si la respuesta es satisfactoria, navega a "personal2.html".
// - Intenta seguir redirect/respuesta JSON antes de forzar la navegación.
// - Evita recargas que pierdan datos.

document.addEventListener('DOMContentLoaded', function () {
  const FORM_KEY = 'ds160-personal1-state-v1';
  const NEXT_FALLBACK = 'personal2.html'; // página a la que debe avanzar
  const safe = fn => { try { fn(); } catch (e) { console.warn(e); } };
  const hide = el => { if (!el) return; el.style.display = 'none'; el.hidden = true; el.setAttribute('aria-hidden','true'); };
  const show = el => { if (!el) return; el.style.display = ''; el.hidden = false; el.removeAttribute('aria-hidden'); };

  /* ---------- Helpers de estado ---------- */
  function removeRequiredFromHidden(form) {
    const requiredEls = Array.from(form.querySelectorAll('[required]'));
    requiredEls.forEach(el => {
      const isHidden = el.hidden ||
        (el.closest && el.closest('[hidden]') !== null) ||
        getComputedStyle(el).display === 'none' ||
        (el.closest && el.closest('.row') && getComputedStyle(el.closest('.row')).display === 'none');
      if (isHidden) {
        try { el.removeAttribute('required'); } catch (e) {}
      }
    });
  }

  function saveFormState(form) {
    try {
      const data = {};
      const elements = form.querySelectorAll('input, select, textarea');
      elements.forEach(el => {
        if (!el.name) return;
        if (el.type === 'checkbox' || el.type === 'radio') {
          data[el.name + '::' + (el.id || '')] = el.checked;
        } else {
          data[el.name] = el.value;
        }
      });
      sessionStorage.setItem(FORM_KEY, JSON.stringify(data));
    } catch (e) { console.warn('saveFormState error', e); }
  }

  function restoreFormState(form) {
    try {
      const raw = sessionStorage.getItem(FORM_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      const elements = form.querySelectorAll('input, select, textarea');
      elements.forEach(el => {
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
    } catch (e) { console.warn('restoreFormState error', e); }
  }

  /* ---------- Reglas UI (ocultamientos, autocompletado, traducciones) ---------- */
  safe(() => {
    // Radios verdes -> marcar "No" y ocultar su bloque textual
    const otherNamesN = document.getElementById('OtherNamesN');
    if (otherNamesN) { otherNamesN.checked = true; otherNamesN.dispatchEvent(new Event('change',{bubbles:true})); }
    const telecodeN = document.getElementById('TelecodeN');
    if (telecodeN) { telecodeN.checked = true; telecodeN.dispatchEvent(new Event('change',{bubbles:true})); }

    const otherLabel = Array.from(document.querySelectorAll('label')).find(l => /¿Ha utilizado otros nombres\?/i.test(l.textContent || ''));
    if (otherLabel) { const r = otherLabel.closest('.row') || otherLabel.parentElement; if (r) hide(r); }
    else { const otherSection = document.getElementById('otherNamesSection'); if (otherSection) hide(otherSection); }

    const teleLabel = Array.from(document.querySelectorAll('label')).find(l => /telecódigo/i.test(l.textContent || ''));
    if (teleLabel) { const r = teleLabel.closest('.row') || teleLabel.parentElement; if (r) hide(r); }
    else { const teleSection = document.getElementById('telecodeSection'); if (teleSection) hide(teleSection); }

    // Nombre nativo: visible y autocompletado = Nombres + Apellidos
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
      // ocultar el checkbox "No aplica" si existe (sin ocultar el campo)
      const naCheckbox = document.getElementById('APP_FULL_NAME_NATIVE_NA');
      if (naCheckbox) {
        naCheckbox.checked = false;
        naCheckbox.dispatchEvent(new Event('change',{bubbles:true}));
        const naContainer = naCheckbox.closest('.inline') || document.querySelector('label[for="APP_FULL_NAME_NATIVE_NA"]')?.parentElement;
        if (naContainer) hide(naContainer);
      }
    }

    // País/Región: poner MÉXICO y ocultar fila + help
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
    const labelCountry = document.querySelector('label[for="POB_COUNTRY"]') || Array.from(document.querySelectorAll('label')).find(l => /País\/Región/i.test(l.textContent || ''));
    if (labelCountry) { const p = labelCountry.closest('.row') || labelCountry.parentElement; if (p) hide(p); }

    // Estado/Provincia: VISIBLE; ocultar sólo su checkbox "No aplica"
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
      if (legend && /Imágenes/i.test(legend.textContent || '')) hide(fs);
    });

    // Traducción de selects (solo texto visible; values se mantienen)
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

  /* ---------- Restaurar estado guardado al cargar ---------- */
  safe(() => {
    const form = document.getElementById('ds160-personal1');
    if (form) restoreFormState(form);
  });

  /* ---------- Manejo del botón "Siguiente" (envío por fetch y navegación garantizada) ---------- */
  safe(() => {
    const nextBtn = document.getElementById('nextBtn');
    const form = document.getElementById('ds160-personal1');
    if (!nextBtn || !form) return;

    // prevenir submit nativo
    form.addEventListener('submit', function (ev) { ev.preventDefault(); });

    nextBtn.addEventListener('click', async function (ev) {
      ev.preventDefault();

      // limpiar required en ocultos y guardar estado
      removeRequiredFromHidden(form);
      saveFormState(form);

      // intentar delegar a handlers globales si existieran
      const candidates = ['goNext', 'nextSection', 'goToNext', 'submitSection', 'onNext'];
      for (const name of candidates) {
        if (typeof window[name] === 'function') {
          try { window[name](); return; } catch (e) { console.warn('error calling', name, e); }
        }
      }

      // construir FormData
      const formData = new FormData(form);
      const action = form.getAttribute('action') || window.location.href;
      const method = (form.getAttribute('method') || 'POST').toUpperCase();

      nextBtn.disabled = true;
      const originalText = nextBtn.textContent;
      nextBtn.textContent = 'Enviando...';

      try {
        const res = await fetch(action, {
          method,
          body: formData,
          credentials: 'same-origin',
          headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });

        // 1) Si fetch siguió una redirección, navegar a la URL final
        if (res.redirected) {
          sessionStorage.setItem(FORM_KEY, JSON.stringify(Object.assign(JSON.parse(sessionStorage.getItem(FORM_KEY) || '{}'), { lastSentAt: Date.now() })));
          window.location.href = res.url;
          return;
        }

        // 2) Si status 3xx (rara vez visible por fetch), intentar leer location header
        if (res.status >= 300 && res.status < 400) {
          const loc = res.headers.get('location');
          if (loc) {
            sessionStorage.setItem(FORM_KEY, JSON.stringify(Object.assign(JSON.parse(sessionStorage.getItem(FORM_KEY) || '{}'), { lastSentAt: Date.now() })));
            const nextUrl = new URL(loc, window.location.href).href;
            window.location.href = nextUrl;
            return;
          }
        }

        // 3) Si OK y HTML, reemplazar documento (si el servidor devuelve la página siguiente)
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.indexOf('text/html') !== -1) {
          const text = await res.text();
          // guardar y reemplazar documento (esto suele llevar al siguiente paso si el server lo envía)
          sessionStorage.setItem(FORM_KEY, JSON.stringify(Object.assign(JSON.parse(sessionStorage.getItem(FORM_KEY) || '{}'), { lastSentAt: Date.now() })));
          document.open();
          document.write(text);
          document.close();
          return;
        }

        // 4) Si OK y JSON con nextUrl
        if (res.ok) {
          try {
            const j = await res.json();
            if (j && j.nextUrl) {
              sessionStorage.setItem(FORM_KEY, JSON.stringify(Object.assign(JSON.parse(sessionStorage.getItem(FORM_KEY) || '{}'), { lastSentAt: Date.now() })));
              window.location.href = new URL(j.nextUrl, window.location.href).href;
              return;
            }
          } catch (_) { /* no es JSON */ }
        }

        // 5) FALLBACK: si la petición fue satisfactoria (res.ok) o al menos 2xx, navegar a personal2.html
        if (res.ok || (res.status >= 200 && res.status < 300)) {
          sessionStorage.setItem(FORM_KEY, JSON.stringify(Object.assign(JSON.parse(sessionStorage.getItem(FORM_KEY) || '{}'), { lastSentAt: Date.now() })));
          // construir URL relativa segura
          const fallback = new URL(NEXT_FALLBACK, window.location.href).href;
          window.location.href = fallback;
          return;
        }

        // 6) Si no fue ok, restaurar estado y mostrar mensaje breve
        restoreFormState(form);
        alert('No se pudo avanzar automáticamente (respuesta del servidor). Los datos siguen guardados localmente. Revisa la consola.');
      } catch (err) {
        console.error('Error enviando formulario vía fetch:', err);
        alert('Error de conexión. Los datos se guardaron localmente. Revisa la consola.');
        restoreFormState(form);
      } finally {
        nextBtn.disabled = false;
        nextBtn.textContent = originalText;
      }
    });
  });

  /* ---------- Guardado periódico para no perder datos ---------- */
  safe(() => {
    const form = document.getElementById('ds160-personal1');
    if (!form) return;
    let lastSnapshot = '';
    setInterval(() => {
      try {
        const values = {};
        const els = form.querySelectorAll('input, select, textarea');
        els.forEach(el => {
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
    }, 5000);
  });

  console.info('personal1.js cargado: UI ajustada; envío por fetch con navegación garantizada a personal2.html.');
});
