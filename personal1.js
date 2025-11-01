// personal1.js
// Reemplazar el personal1.js actual por este archivo.
// - Evita recarga que borra datos: guarda en sessionStorage antes de enviar.
// - Envía el formulario con fetch (si hay redirect, navegamos).
// - Restaura formulario desde sessionStorage al cargar.
// - Mantiene las modificaciones UI previas (ocultamientos/autocompletado/traducciones).

document.addEventListener('DOMContentLoaded', function () {
  const FORM_KEY = 'ds160-personal1-state-v1';
  const safe = fn => { try { fn(); } catch (e) { console.warn(e); } };
  const hide = el => { if (!el) return; el.style.display = 'none'; el.hidden = true; el.setAttribute('aria-hidden','true'); };
  const show = el => { if (!el) return; el.style.display = ''; el.hidden = false; el.removeAttribute('aria-hidden'); };

  // ---------- Utilities ----------
  function removeRequiredFromHidden(form) {
    const requiredEls = Array.from(form.querySelectorAll('[required]'));
    requiredEls.forEach(el => {
      const isHidden = el.hidden || (el.closest && el.closest('[hidden]') !== null) ||
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
        } else if (el.tagName === 'SELECT') {
          data[el.name] = el.value;
        } else {
          data[el.name] = el.value;
        }
      });
      sessionStorage.setItem(FORM_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('saveFormState error', e);
    }
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
        // dispatch change/input for dependent logic
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
    } catch (e) {
      console.warn('restoreFormState error', e);
    }
  }

  // ---------- UI rules previas ----------
  safe(() => {
    // Radios verdes -> marcar "No" y ocultar sus bloques
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
      // ocultar sólo el checkbox "No aplica / Tecnología no disponible" si existe
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

    // Estado/Provincia: visible; ocultar sólo su checkbox "No aplica"
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

    // Traducción selects (solo texto visible; values se mantienen)
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

  // ---------- Restore saved state if exists ----------
  safe(() => {
    const form = document.getElementById('ds160-personal1');
    if (form) restoreFormState(form);
  });

  // ---------- Next button: save + submit via fetch (no recarga brutal) ----------
  safe(() => {
    const nextBtn = document.getElementById('nextBtn');
    const form = document.getElementById('ds160-personal1');
    if (!nextBtn || !form) return;

    // Intercept native submit to avoid default full reload when we handle via fetch
    form.addEventListener('submit', function (ev) {
      // prevent double submit via native submit (we handle via fetch)
      ev.preventDefault();
    });

    nextBtn.addEventListener('click', async function (ev) {
      ev.preventDefault();
      // 1) quitar required en campos ocultos para que no bloqueen
      removeRequiredFromHidden(form);

      // 2) guardar estado antes de enviar (para recuperación en caso de recarga)
      saveFormState(form);

      // 3) intentar delegar a handlers globales si existen (mantener compatibilidad)
      const candidates = ['goNext', 'nextSection', 'goToNext', 'submitSection', 'onNext'];
      for (const name of candidates) {
        if (typeof window[name] === 'function') {
          try { window[name](); return; } catch (e) { console.warn('error calling', name, e); }
        }
      }

      // 4) construir FormData
      const formData = new FormData(form);

      // 5) enviar por fetch al action del form (o a la URL actual si no hay action)
      const action = form.getAttribute('action') || window.location.href;
      const method = (form.getAttribute('method') || 'POST').toUpperCase();

      // disable button to avoid dobles clicks
      nextBtn.disabled = true;
      const originalText = nextBtn.textContent;
      nextBtn.textContent = 'Enviando...';

      try {
        const res = await fetch(action, {
          method,
          body: formData,
          credentials: 'same-origin',
          headers: { 'X-Requested-With': 'XMLHttpRequest' } // ayudar al server a distinguir petición XHR
        });

        // si el servidor redirige (Location), fetch automáticamente sigue redirect en modo "follow"
        if (res.redirected) {
          // guardamos estado y navegamos a la URL final
          sessionStorage.setItem(FORM_KEY, JSON.stringify(Object.assign(JSON.parse(sessionStorage.getItem(FORM_KEY) || '{}'), { lastSentAt: Date.now() })));
          window.location.href = res.url;
          return;
        }

        // si recibimos HTML (200), reemplazamos el documento con la respuesta (suponiendo que es la siguiente página)
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.indexOf('text/html') !== -1) {
          const text = await res.text();
          // guardar estado final antes de reemplazar
          sessionStorage.setItem(FORM_KEY, JSON.stringify(Object.assign(JSON.parse(sessionStorage.getItem(FORM_KEY) || '{}'), { lastSentAt: Date.now() })));
          document.open();
          document.write(text);
          document.close();
          return;
        }

        // si no es HTML o no OK, intentar parse JSON con instrucciones del servidor
        if (res.ok) {
          try {
            const j = await res.json();
            if (j && j.nextUrl) {
              sessionStorage.setItem(FORM_KEY, JSON.stringify(Object.assign(JSON.parse(sessionStorage.getItem(FORM_KEY) || '{}'), { lastSentAt: Date.now() })));
              window.location.href = j.nextUrl;
              return;
            }
          } catch (_) {}
        }

        // fallback: si no podemos avanzar automáticamente, restauramos estado y permitimos que el usuario reintente
        alert('No se pudo avanzar automáticamente. Se han guardado los datos en el formulario; intenta nuevamente o recarga la página.');
        restoreFormState(form);
      } catch (err) {
        console.error('Error enviando formulario vía fetch:', err);
        alert('Error de envío. Datos guardados localmente. Revisa la consola para más detalles.');
        restoreFormState(form);
      } finally {
        nextBtn.disabled = false;
        nextBtn.textContent = originalText;
      }
    });
  });

  // ---------- Guardado automático periódico (evita perder datos si la página se recarga) ----------
  safe(() => {
    const form = document.getElementById('ds160-personal1');
    if (!form) return;
    // cada 5s guarda si hay cambios
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

  console.info('personal1.js cargado: guardado/restauración activados; envío por fetch seguro; UI ajustada.');
});
