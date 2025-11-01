// personal1.js
// Reemplazar el personal1.js actual por este archivo.

document.addEventListener('DOMContentLoaded', function () {
  const safe = fn => { try { fn(); } catch (e) { console.warn(e); } };
  const hide = el => { if (!el) return; el.style.display = 'none'; el.hidden = true; el.setAttribute('aria-hidden','true'); };
  const show = el => { if (!el) return; el.style.display = ''; el.hidden = false; el.removeAttribute('aria-hidden'); };

  // 1) Radios verdes -> marcar "No" y ocultar sus bloques específicos
  safe(() => {
    const otherNamesN = document.getElementById('OtherNamesN');
    if (otherNamesN) { otherNamesN.checked = true; otherNamesN.dispatchEvent(new Event('change',{bubbles:true})); }
    const telecodeN = document.getElementById('TelecodeN');
    if (telecodeN) { telecodeN.checked = true; telecodeN.dispatchEvent(new Event('change',{bubbles:true})); }

    // ocultar bloque textual de "¿Ha utilizado otros nombres?"
    const otherLabel = Array.from(document.querySelectorAll('label')).find(l => /¿Ha utilizado otros nombres\?/i.test(l.textContent));
    if (otherLabel) {
      const otherRow = otherLabel.closest('.row') || otherLabel.parentElement;
      if (otherRow) hide(otherRow);
    } else {
      const otherSection = document.getElementById('otherNamesSection');
      if (otherSection) hide(otherSection);
    }

    // ocultar bloque textual de "¿Tiene un telecódigo...?"
    const teleLabel = Array.from(document.querySelectorAll('label')).find(l => /telecódigo/i.test(l.textContent));
    if (teleLabel) {
      const teleRow = teleLabel.closest('.row') || teleLabel.parentElement;
      if (teleRow) hide(teleRow);
    } else {
      const teleSection = document.getElementById('telecodeSection');
      if (teleSection) hide(teleSection);
    }
  });

  // 2) Autocompletar Nombre nativo = Nombres + Apellidos (en tiempo real) y mostrar su fila
  safe(() => {
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
      const row = fullNative.closest('.row');
      if (row) show(row);
      if (given) { given.addEventListener('input', updateFull); given.addEventListener('change', updateFull); }
      if (surname) { surname.addEventListener('input', updateFull); surname.addEventListener('change', updateFull); }
      updateFull();

      // ocultar sólo el checkbox "No aplica / Tecnología no disponible" si existe (no ocultar el campo)
      const naCheckbox = document.getElementById('APP_FULL_NAME_NATIVE_NA');
      if (naCheckbox) {
        naCheckbox.checked = false;
        naCheckbox.dispatchEvent(new Event('change',{bubbles:true}));
        const naContainer = naCheckbox.closest('.inline') || document.querySelector('label[for="APP_FULL_NAME_NATIVE_NA"]')?.parentElement;
        if (naContainer) hide(naContainer);
      }
    }
  });

  // 3) Poner MÉXICO por defecto en País/Región y ocultar la fila País/Región + su help
  safe(() => {
    const country = document.getElementById('POB_COUNTRY');
    if (country) {
      const mxOpt = Array.from(country.options).find(o => ((o.text||'').trim().toUpperCase()) === 'MÉXICO' || ((o.text||'').trim().toUpperCase()) === 'MEXICO');
      if (mxOpt) country.value = mxOpt.value !== '' ? mxOpt.value : mxOpt.text;
      country.dispatchEvent(new Event('change',{bubbles:true}));
      const cRow = country.closest('.row') || country.parentElement;
      if (cRow) hide(cRow);
    }

    // ocultar ayuda específica si existe
    Array.from(document.querySelectorAll('.help')).forEach(h => {
      const t = (h.textContent||'').trim();
      if (/Lista acotada a países/i.test(t) || /países del continente americano/i.test(t) || /Lista acotada/i.test(t)) hide(h);
    });

    // ocultar label "País/Región" suelto si existe
    const labelCountry = document.querySelector('label[for="POB_COUNTRY"]') || Array.from(document.querySelectorAll('label')).find(l => /País\/Región/i.test(l.textContent||''));
    if (labelCountry) {
      const parent = labelCountry.closest('.row') || labelCountry.parentElement;
      if (parent) hide(parent);
    }
  });

  // 4) Estado/Provincia: asegurar VISIBLE y OCULTAR únicamente su checkbox "No aplica" (label y contenedor)
  safe(() => {
    const state = document.getElementById('POB_STATE');
    if (state) {
      // garantizar fila visible
      const stateRow = state.closest('.row');
      if (stateRow) show(stateRow);

      // ocultar sólo el checkbox "No aplica"
      const naBox = document.getElementById('POB_STATE_NA');
      if (naBox) {
        naBox.checked = false;
        naBox.dispatchEvent(new Event('change',{bubbles:true}));
        // intentar ubicar el contenedor del checkbox y su label y ocultarlos
        const naContainer = naBox.closest('.inline') || document.querySelector('label[for="POB_STATE_NA"]')?.parentElement;
        if (naContainer) hide(naContainer);
        const naLabel = document.querySelector('label[for="POB_STATE_NA"]');
        if (naLabel) {
          const parent = naLabel.closest('.row') || naLabel.parentElement;
          if (parent && parent !== stateRow) hide(parent); // no ocultar la fila del estado
        }
      }
    }
  });

  // 5) Ocultar fieldset Imágenes si existe
  safe(() => {
    Array.from(document.querySelectorAll('fieldset')).forEach(fs => {
      const legend = fs.querySelector('legend');
      if (legend && /Imágenes/i.test(legend.textContent)) hide(fs);
    });
  });

  // 6) Traducción de selects (solo texto visible; values se mantienen)
  safe(() => {
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

  console.info('personal1.js aplicado: sólo ocultada la casilla "No aplica" del Estado; Estado visible; demás reglas aplicadas.');
});
