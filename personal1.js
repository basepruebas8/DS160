// personal1.js
// Reemplazar el personal1.js actual por este archivo.

document.addEventListener('DOMContentLoaded', function () {
  function hideElement(el) {
    if (!el) return;
    el.style.display = 'none';
    el.hidden = true;
    el.setAttribute('aria-hidden', 'true');
  }
  function showElement(el) {
    if (!el) return;
    el.style.display = '';
    el.hidden = false;
    el.removeAttribute('aria-hidden');
  }
  // marcar "No" en radios verdes y ocultar sus filas
  try {
    const otherNamesNo = document.getElementById('OtherNamesN');
    if (otherNamesNo) {
      otherNamesNo.checked = true;
      otherNamesNo.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const telecodeNo = document.getElementById('TelecodeN');
    if (telecodeNo) {
      telecodeNo.checked = true;
      telecodeNo.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // ocultar secciones de "Otros nombres" y "Telecódigo" si existen
    const otherNamesLabel = Array.from(document.querySelectorAll('label')).find(l => /¿Ha utilizado otros nombres\?/i.test(l.textContent));
    if (otherNamesLabel) {
      const row = otherNamesLabel.closest('.row');
      if (row) hideElement(row);
    } else {
      const otherNamesSection = document.getElementById('otherNamesSection');
      if (otherNamesSection) hideElement(otherNamesSection);
    }

    const telecodeLabel = Array.from(document.querySelectorAll('label')).find(l => /telecódigo/i.test(l.textContent));
    if (telecodeLabel) {
      const row = telecodeLabel.closest('.row');
      if (row) hideElement(row);
    } else {
      const telecodeSection = document.getElementById('telecodeSection');
      if (telecodeSection) hideElement(telecodeSection);
    }
  } catch (e) {
    console.warn('Error radios verdes:', e);
  }

  // Poner México por defecto en POB_COUNTRY y ocultar la fila si se desea
  try {
    const pobCountry = document.getElementById('POB_COUNTRY');
    if (pobCountry) {
      const opt = Array.from(pobCountry.options).find(o => {
        const t = (o.text || '').trim().toUpperCase();
        return t === 'MÉXICO' || t === 'MEXICO';
      });
      if (opt) {
        pobCountry.value = opt.value !== '' ? opt.value : opt.text;
        pobCountry.dispatchEvent(new Event('change', { bubbles: true }));
      }
      // si quieres ocultar País/Región (rojo) mantenemos ocultamiento:
      const countryRow = pobCountry.closest('.row');
      if (countryRow) hideElement(countryRow);
    }
  } catch (e) {
    console.warn('Error POB_COUNTRY:', e);
  }

  // Asegurar que Estado/Provincia NO quede oculto
  try {
    const pobState = document.getElementById('POB_STATE');
    if (pobState) {
      const stateRow = pobState.closest('.row');
      if (stateRow) showElement(stateRow);
      // también aseguramos que el checkbox relacionado no oculte por accidente
      const naBox = document.getElementById('POB_STATE_NA');
      if (naBox) {
        // dejar sin marcar
        naBox.checked = false;
        naBox.dispatchEvent(new Event('change', { bubbles: true }));
        // no ocultar su contenedor
        const naContainer = naBox.closest('.inline');
        if (naContainer) showElement(naContainer);
      }
    }
  } catch (e) {
    console.warn('Error asegurando Estado/Provincia visible:', e);
  }

  // Traducir selects azules a español (manteniendo values)
  try {
    const gender = document.getElementById('APP_GENDER');
    if (gender) {
      gender.innerHTML = [
        '<option value="">- Seleccione -</option>',
        '<option value="MALE">Masculino</option>',
        '<option value="FEMALE">Femenino</option>'
      ].join('');
    }
    const marital = document.getElementById('APP_MARITAL_STATUS');
    if (marital) {
      marital.innerHTML = [
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
  } catch (e) {
    console.warn('Error traducción selects:', e);
  }

  // Asegurar Nombre completo en alfabeto nativo visible y AUTOCOMPLETAR con Nombres + Apellidos
  try {
    const given = document.getElementById('APP_GIVEN_NAME');
    const surname = document.getElementById('APP_SURNAME');
    const fullNative = document.getElementById('APP_FULL_NAME_NATIVE');

    function updateFullNative() {
      if (!fullNative) return;
      const g = (given && given.value) ? given.value.trim() : '';
      const s = (surname && surname.value) ? surname.value.trim() : '';
      const combined = [g, s].filter(Boolean).join(' ').trim();
      fullNative.value = combined;
      // marcar required si hay contenido (mantener comportamiento original)
      if (combined) fullNative.removeAttribute('disabled');
    }

    // mostrar fila de full name
    if (fullNative) {
      const row = fullNative.closest('.row');
      if (row) showElement(row);
      // aseguramos que checkbox "No aplica" no esté marcado
      const naCheckbox = document.getElementById('APP_FULL_NAME_NATIVE_NA');
      if (naCheckbox) {
        naCheckbox.checked = false;
        naCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
        // ocultar solo el checkbox si antes estaba en rojo (opcional)
        const naContainer = naCheckbox.closest('.inline');
        if (naContainer) hideElement(naContainer);
      }
      // inicializar valor
      updateFullNative();
      // escuchar cambios en nombres para mantener actualizado
      if (given) {
        given.addEventListener('input', updateFullNative);
        given.addEventListener('change', updateFullNative);
      }
      if (surname) {
        surname.addEventListener('input', updateFullNative);
        surname.addEventListener('change', updateFullNative);
      }
    }
  } catch (e) {
    console.warn('Error autocompletando Nombre completo:', e);
  }

  // Ocultar fieldset Imágenes si existe (comportamiento previo)
  try {
    const fieldsets = document.querySelectorAll('fieldset');
    for (const fs of fieldsets) {
      const legend = fs.querySelector('legend');
      if (legend && /Imágenes/i.test(legend.textContent)) {
        hideElement(fs);
      }
    }
  } catch (e) {
    console.warn('Error ocultando Imágenes:', e);
  }

  // limpieza final: evitar que algún ocultamiento por palabra clave afecte Estado/Provincia o Nombre
  try {
    // mostrar explícitamente Estado/Provincia y Nombre nativo
    const pobState = document.getElementById('POB_STATE');
    if (pobState) {
      const row = pobState.closest('.row');
      if (row) showElement(row);
    }
    const fullNative = document.getElementById('APP_FULL_NAME_NATIVE');
    if (fullNative) {
      const row = fullNative.closest('.row');
      if (row) showElement(row);
    }
  } catch (e) {
    console.warn('Error en limpieza final:', e);
  }

  console.info('personal1.js aplicado: Estado/Provincia visible; Nombre nativo autocompletado con Nombres+Apellidos; radios verdes = No; país por defecto aplicado.');
});
