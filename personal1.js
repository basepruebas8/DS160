// personal1.js
// Sustituir el personal1.js actual por este.
// Oculta los bloques "rojos", deja visible "Nombre completo en alfabeto nativo",
// marca radios verdes en "No" y pone México como país por defecto.

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

  // 1) Asegurar nombre nativo visible
  try {
    const fullNameInput = document.getElementById('APP_FULL_NAME_NATIVE');
    if (fullNameInput) {
      const row = fullNameInput.closest('.row');
      showElement(row);
      // desmarcar checkbox "No aplica / Tecnología no disponible"
      const naCheckbox = document.getElementById('APP_FULL_NAME_NATIVE_NA');
      if (naCheckbox) {
        naCheckbox.checked = false;
        naCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
        // ocultar sólo el checkbox y su label si estaban dentro del área roja
        const naContainer = naCheckbox.closest('.inline');
        if (naContainer) hideElement(naContainer);
      }
    }
  } catch (e) {
    console.warn('Error preservando nombre nativo visible:', e);
  }

  // 2) Radios verdes -> marcar "No" y ocultar los radios (fila entera)
  try {
    // Otros nombres
    const otherNamesNo = document.getElementById('OtherNamesN');
    const otherNamesRowLabel = Array.from(document.querySelectorAll('label'))
      .find(l => /¿Ha utilizado otros nombres\?/i.test(l.textContent));
    if (otherNamesNo) {
      otherNamesNo.checked = true;
      otherNamesNo.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (otherNamesRowLabel) {
      const row = otherNamesRowLabel.closest('.row');
      hideElement(row);
    } else {
      // fallback: ocultar sección por id si existe
      const otherNamesSection = document.getElementById('otherNamesSection');
      if (otherNamesSection) hideElement(otherNamesSection);
    }

    // Telecódigo
    const telecodeNo = document.getElementById('TelecodeN');
    const telecodeLabel = Array.from(document.querySelectorAll('label'))
      .find(l => /telecódigo/i.test(l.textContent));
    if (telecodeNo) {
      telecodeNo.checked = true;
      telecodeNo.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (telecodeLabel) {
      const row = telecodeLabel.closest('.row');
      hideElement(row);
    } else {
      const telecodeSection = document.getElementById('telecodeSection');
      if (telecodeSection) hideElement(telecodeSection);
    }
  } catch (e) {
    console.warn('Error ocultando radios verdes:', e);
  }

  // 3) Enmarcado amarillo -> Poner México por defecto (si existe) pero ocultar la fila si debe ir en rojo
  try {
    const pobCountry = document.getElementById('POB_COUNTRY');
    if (pobCountry) {
      const opt = Array.from(pobCountry.options).find(o => {
        const t = (o.text || '').trim().toUpperCase();
        return t === 'MÉXICO' || t === 'MEXICO' || t === 'ESTADOS UNIDOS' && false;
      });
      if (opt) {
        pobCountry.value = opt.value !== '' ? opt.value : opt.text;
        pobCountry.dispatchEvent(new Event('change', { bubbles: true }));
      }
      // ocultar la fila completa de País/Región (porque está en rojo)
      const countryRow = pobCountry.closest('.row');
      if (countryRow) hideElement(countryRow);
    }
  } catch (e) {
    console.warn('Error con POB_COUNTRY:', e);
  }

  // 4) Enmarcados en azul -> asegurarse que los selects estén en español (no los ocultamos)
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
    console.warn('Error traduciendo selects:', e);
  }

  // 5) Ocultar fieldset de Imágenes si existe (suele ir en rojo)
  try {
    const fieldsets = document.querySelectorAll('fieldset');
    for (const fs of fieldsets) {
      const legend = fs.querySelector('legend');
      if (legend && /Imágenes/i.test(legend.textContent)) {
        hideElement(fs);
      }
    }
  } catch (e) {
    console.warn('Error ocultando fieldset Imágenes:', e);
  }

  // 6) Como medida extra: ocultar cualquier fila cuya etiqueta contenga palabras que suelen estar en rojo
  try {
    const labels = document.querySelectorAll('.row > label, label');
    const hideKeywords = [
      'No aplica / Tecnología no disponible',
      'No aplica',
      'Archivos guardados',
      'Selecciona imágenes',
      'Imágenes',
      'País/Región'
    ];
    labels.forEach(lbl => {
      const text = (lbl.textContent || '').trim();
      if (!text) return;
      for (const kw of hideKeywords) {
        if (text.includes(kw)) {
          const row = lbl.closest('.row') || lbl.closest('fieldset') || lbl.parentElement;
          if (row) hideElement(row);
          break;
        }
      }
    });
  } catch (e) {
    console.warn('Error aplicando ocultamiento por palabras clave:', e);
  }

  // 7) Mensaje de depuración en consola
  console.info('personal1.js aplicado: elementos rojos ocultos, nombre nativo visible, radios verdes = No, país por defecto aplicado (si existe).');
});
