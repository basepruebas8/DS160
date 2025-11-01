// personal1.js
// Sustituir el personal1.js actual por este archivo.
// Funciones:
// - Radios "Otros nombres" y "Telecódigo" = No (ocultos).
// - Autocompleta "Nombre completo en alfabeto nativo" = Nombres + Apellidos (visible).
// - Pone MÉXICO en País/Región y oculta la fila País/Región y su help.
// - Deja Estado/Provincia visible pero OCULTA su checkbox "No aplica".
// - Oculta fieldset Imágenes.
// - Traduce selects a español (manteniendo values).

document.addEventListener('DOMContentLoaded', function () {
  const safe = fn => { try { fn(); } catch (e) { console.warn(e); } };
  const hide = el => { if (!el) return; el.style.display = 'none'; el.hidden = true; el.setAttribute('aria-hidden','true'); };
  const show = el => { if (!el) return; el.style.display = ''; el.hidden = false; el.removeAttribute('aria-hidden'); };

  // 1) Radios verdes -> marcar "No" y ocultar sus filas/sectores
  safe(() => {
    const otherNamesN = document.getElementById('OtherNamesN');
    if (otherNamesN) { otherNamesN.checked = true; otherNamesN.dispatchEvent(new Event('change',{bubbles:true})); }
    const telecodeN = document.getElementById('TelecodeN');
    if (telecodeN) { telecodeN.checked = true; telecodeN.dispatchEvent(new Event('change',{bubbles:true})); }

    // ocultar bloque "¿Ha utilizado otros nombres?"
    const otherLabel = Array.from(document.querySelectorAll('label')).find(l => /¿Ha utilizado otros nombres\?/i.test(l.textContent));
    if (otherLabel) hide(otherLabel.closest('.row') || otherLabel.parentElement);
    else {
      const otherSection = document.getElementById('otherNamesSection');
      if (otherSection) hide(otherSection);
    }

    // ocultar bloque "¿Tiene un telecódigo...?"
    const teleLabel = Array.from(document.querySelectorAll('label')).find(l => /telecódigo/i.test(l.textContent));
    if (teleLabel) hide(teleLabel.closest('.row') || teleLabel.parentElement);
    else {
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
      // listeners
      if (given) { given.addEventListener('input', updateFull); given.addEventListener('change', updateFull); }
      if (surname) { surname.addEventListener('input', updateFull); surname.addEventListener('change', updateFull); }
      updateFull();
      // asegurar checkbox "No aplica / Tecnología no disponible" desmarcado; ocultar su contenedor si existe
      const naCheckbox = document.getElementById('APP_FULL_NAME_NATIVE_NA');
      if (naCheckbox) {
        naCheckbox.checked = false;
        naCheckbox.dispatchEvent(new Event('change',{bubbles:true}));
        const naContainer = naCheckbox.closest('.inline') || document.querySelector('label[for="APP_FULL_NAME_NATIVE_NA"]')?.parentElement;
        if (naContainer) hide(naContainer);
      }
    }
  });

  // 3) Poner MÉXICO por defecto en País/Región y ocultar la fila + help relacionado
  safe(() => {
    const country = document.getElementById('POB_COUNTRY');
    if (country) {
      const mxOpt = Array.from(country.options).find(o => ((o.text||'').trim().toUpperCase()) === 'MÉXICO' || ((o.text||'').trim().toUpperCase()) === 'MEXICO');
      if (mxOpt) country.value = mxOpt.value !== '' ? mxOpt.value : mxOpt.text;
      country.dispatchEvent(new Event('change',{bubbles:true}));
      // ocultar fila del select
      const cRow = country.closest('.row') || country.parentElement;
      if (cRow) hide(cRow);
    }
    // ocultar textos de ayuda relacionados
    Array.from(document.querySelectorAll('.help')).forEach(h => {
      const t = (h.textContent||'').trim();
      if (/Lista acotada a países/i.test(t) || /países del continente americano/i.test(t) || /Lista acotada/i.test(t)) hide(h);
    });
    // ocultar label suelto si existe
    Array.from(document.querySelectorAll('label')).forEach(l => {
      if (/País\/Región/i.test(l.textContent||'')) hide(l.closest('.row')||l.parentElement);
    });
  });

  // 4) Estado/Provincia: asegurar VISIBLE pero OCULTAR su checkbox "No aplica"
  safe(() => {
    const state = document.getElementById('POB_STATE');
    if (state) {
      const stateRow = state.closest('.row');
      if (stateRow) show(stateRow);

      // ocultar checkbox "No aplica" asociado (input y label)
      const naBox = document.getElementById('POB_STATE_NA');
      if (naBox) {
        naBox.checked = false;
        naBox.dispatchEvent(new Event('change',{bubbles:true}));
        const naContainer = naBox.closest('.inline') || document.querySelector('label[for="POB_STATE_NA"]')?.parentElement;
        if (naContainer) hide(naContainer);
        // además ocultar label aislado si existiera
        const naLabel = document.querySelector('label[for="POB_STATE_NA"]');
        if (naLabel) hide(naLabel.closest('.row') || naLabel.parentElement);
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

  console.info('personal1.js aplicado: ocultadas filas solicitadas; POB_STATE mantiene visible pero su "No aplica" oculto; Nombre nativo autocompletado.');
});
