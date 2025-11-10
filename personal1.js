// personal1.js (integrado, sin parches)
// Objetivo:
// - Sección "Imágenes" visible y funcional (guardar local, listar, ver/descargar/eliminar, progreso, refrescar).
// - Autocompleta "Nombre completo en alfabeto nativo" = Nombres + Apellidos (campo oculto) y lo guarda.
// - Radios "Otros nombres" y "Telecódigo" forzados a "No" y ocultos.
// - "Estado/Provincia" visible; sólo se oculta su casilla "No aplica" (igual para "Nombre nativo").
// - Guarda/restaura página en sessionStorage.
// - Mantiene un JSON maestro en sessionStorage (ds160-all) y fusiona esta página como forms['ds160-personal1']
//   + alias en raíz: APP_SURNAME / APP_GIVEN_NAME / app_surname / app_given_name / full_name.
// - "Siguiente" valida sólo campos requeridos visibles; si falta algo, no avanza.
// - Navega a personal2.html con query string.

(function(){
  'use strict';

  // ===== Constantes =====
  const FORM_ID = 'ds160-personal1';
  const PAGE_TITLE = 'DS-160 · Información personal 1';
  const PAGE_KEY = 'ds160-personal1';
  const FORM_KEY = 'ds160-personal1-state-v3';
  const FORM_KEY_RAW = 'ds160-personal1-raw-v3';
  const MASTER_KEY = 'ds160-all';
  const IMAGES_META_KEY = 'ds160-images-meta';

  const NEXT_PAGE = 'personal2.html';
  const PREVIEW_LIMIT = 12 * 1024 * 1024; // 12 MB por imagen (vista)
  const DOWNLOAD_LIMIT = 12 * 1024 * 1024; // 12 MB descarga directa

  // ===== Utilidades DOM =====
  function $(sel, root){ return (root||document).querySelector(sel); }
  function $all(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }
  function text(el, t){ if (el) el.textContent = t; }
  function show(el, on){ if(!el) return; el.style.display = on ? '' : 'none'; }
  function isHiddenLike(el){
    if (!el) return true;
    if (el.hidden) return true;
    if (el.type && el.type.toLowerCase()==='hidden') return true;
    if (el.closest('[hidden]')) return true;
    const cs = getComputedStyle(el);
    if (cs && (cs.display==='none' || cs.visibility==='hidden')) return true;
    return false;
  }
  function keyOf(el){
    const id = el.id ? `#${el.id}` : '';
    const name = (el.name||'').trim();
    return name || id || '';
  }
  function asNumber(v){
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  function debounce(fn, ms){
    let t=null;
    return (...args)=>{
      if (t) clearTimeout(t);
      t=setTimeout(()=>fn(...args), ms);
    };
  }

  // ===== Estado UI =====
  function setStatus(msg){
    const el = $('#saveMsg');
    if (el){ el.textContent = msg||''; }
  }

  // ===== Normalización y colecta =====
  function normalizeName(s){ return (s||'').toString().trim().replace(/\s+/g,' '); }
  function collectRaw(form){
    const o = {};
    $all('input, select, textarea', form).forEach(el=>{
      const t = (el.type||'').toLowerCase();
      const k = keyOf(el);
      if (!k) return;
      if (t==='checkbox'){
        o[k] = !!el.checked;
      }else if (t==='radio'){
        if (el.checked) o[k] = el.value;
      }else{
        o[k] = el.value;
      }
    });
    return o;
  }
  function collectNormalized(form){
    const raw = collectRaw(form);
    const out = {};

    // Mapea campos relevantes
    out.APP_SURNAME     = normalizeName(raw.APP_SURNAME || raw['#APP_SURNAME']);
    out.APP_GIVEN_NAME  = normalizeName(raw.APP_GIVEN_NAME || raw['#APP_GIVEN_NAME']);

    // Alias en minúscula
    out.app_surname     = out.APP_SURNAME || '';
    out.app_given_name  = out.APP_GIVEN_NAME || '';

    // Full name para conveniencia
    const given = out.APP_GIVEN_NAME || '';
    const surn  = out.APP_SURNAME || '';
    const fullNative = normalizeName([given, surn].filter(Boolean).join(' '));
    out.full_name = fullNative;

    // Otros campos (extracto relevante de la página)
    // Radios que forzamos a "No":
    out.OtherNames = 'No';
    out.TelecodeQuestion = 'No';

    // Native full name visible/oculto
    out.APP_FULL_NAME_NATIVE = fullNative || '';
    out.APP_FULL_NAME_NATIVE_NA = !fullNative; // Si no hay nombre nativo, "No aplica"

    // Lugar de nacimiento
    out.POB_CITY   = normalizeName(raw.POB_CITY || '');
    out.POB_STATE  = normalizeName(raw.POB_STATE || '');
    out.POB_STATE_NA = false; // Mantener visible Estado/Provincia

    // Año de nacimiento
    out.DOB_YEAR = (raw.DOB_YEAR||'').toString().slice(0,4);

    // Telecódigo / otros nombres
    out.OTHER_GIVEN   = normalizeName(raw.OTHER_GIVEN || '');
    out.OTHER_SURNAME = normalizeName(raw.OTHER_SURNAME || '');
    out.TELECODE_GIVEN   = normalizeName(raw.TELECODE_GIVEN || '');
    out.TELECODE_SURNAME = normalizeName(raw.TELECODE_SURNAME || '');

    return out;
  }
  function saveFormState(form){
    try{
      sessionStorage.setItem(FORM_KEY_RAW, JSON.stringify(collectRaw(form)));
      sessionStorage.setItem(FORM_KEY, JSON.stringify(collectNormalized(form)));
    }catch(e){ console.warn('saveFormState', e); }
  }
  function restoreFormState(form){
    try{
      const normStr=sessionStorage.getItem(FORM_KEY);
      const rawStr=sessionStorage.getItem(FORM_KEY_RAW);
      if (normStr){
        const norm=JSON.parse(normStr);
        Array.from(form.querySelectorAll('input, select, textarea')).forEach(el=>{
          const nameKey=(el.name||'').trim(); const idKey=el.id?`#${el.id}`:'';
          const t=(el.type||'').toLowerCase();
          let k='';

          if (nameKey && (nameKey in norm)) k=nameKey;
          else if (idKey && (idKey in norm)) k=idKey;

          if (!k) return;

          if (t==='checkbox'){
            el.checked = !!norm[k];
          }else if (t==='radio'){
            el.checked = (el.value===norm[k]);
          }else{
            if (norm[k] != null) el.value = norm[k];
          }
        });

        // Autocompletar nombre nativo
        const given = norm.APP_GIVEN_NAME || '';
        const surn  = norm.APP_SURNAME || '';
        const fullNative = normalizeName([given, surn].filter(Boolean).join(' '));

        const nativeEl = document.getElementById('APP_FULL_NAME_NATIVE');
        if (nativeEl){ nativeEl.value = fullNative; }

        // Asegura alias raíz en maestro
        const master = readMaster();
        if (!master.APP_SURNAME && norm.APP_SURNAME) master.APP_SURNAME = norm.APP_SURNAME;
        if (!master.APP_GIVEN_NAME && norm.APP_GIVEN_NAME) master.APP_GIVEN_NAME = norm.APP_GIVEN_NAME;
        if (!master.app_surname && norm.app_surname) master.app_surname = norm.app_surname;
        if (!master.app_given_name && norm.app_given_name) master.app_given_name = norm.app_given_name;
        if (!master.full_name && fullNative) master.full_name = fullNative;
        writeMaster(master);
      }
    }catch(e){ console.warn('restoreFormState', e); }
  }

  // ===== Maestro =====
  function readMaster(){ try{ const s=sessionStorage.getItem(MASTER_KEY); return s?JSON.parse(s):{}; }catch{ return {}; } }
  function writeMaster(o){ try{ sessionStorage.setItem(MASTER_KEY, JSON.stringify(o)); }catch{} }
  function readImagesMeta(){ try{ const s=sessionStorage.getItem(IMAGES_META_KEY); return s?JSON.parse(s):[]; }catch{ return []; } }
  function mergeIntoMaster(){
    const form=document.getElementById('ds160-personal1'); if (!form) return;
    const section=collectNormalized(form);
    const imgs=readImagesMeta();

    const master=readMaster();
    master.forms = master.forms || {};
    master.forms[PAGE_KEY]=section;

    // Alias en raíz (servidos leen aquí si hace falta)
    if (section.APP_SURNAME)    master.APP_SURNAME    = section.APP_SURNAME;
    if (section.APP_GIVEN_NAME) master.APP_GIVEN_NAME = section.APP_GIVEN_NAME;
    if (section.app_surname)    master.app_surname    = section.app_surname;
    if (section.app_given_name) master.app_given_name = section.app_given_name;
    if (section.full_name)      master.full_name      = section.full_name;

    // Imágenes: solo metadatos, taggeadas por página
    const withPage = imgs.map(x=>Object.assign({}, x, { page: PAGE_KEY }));
    master.images_meta = Array.isArray(master.images_meta) ? master.images_meta : [];
    // reemplaza (simple) por las de esta página
    const rest = master.images_meta.filter(x=>x.page!==PAGE_KEY);
    master.images_meta = rest.concat(withPage);

    writeMaster(master);
  }

  // ===== Validación =====
  function isRequired(el){ return !!el.getAttribute('required'); }
  function isFormValid(form){
    let valid = true; const seen=new Set();
    Array.from(form.querySelectorAll('[required]')).forEach(el=>{
      if (isHiddenLike(el)) return;
      const t=(el.type||'').toLowerCase();
      if (t==='radio' || t==='checkbox'){
        const name = el.name || keyOf(el);
        if (!name || seen.has(name)) return;
        seen.add(name);
        const sel = name.startsWith('#') ? `input#${name.slice(1)}` : `input[name="${name}"]`;
        const group = Array.from(form.querySelectorAll(sel));
        const any = group.some(i=>i.checked);
        if (!any) valid=false;
      }else{
        if (!el.value || !el.value.toString().trim()) valid=false;
      }
    });
    return valid;
  }

  // ===== Navegación =====
  function goNext(){
    const url = new URL(NEXT_PAGE, location.href);
    location.href = url.href;
  }

  // ===== Imágenes (IndexedDB expuesto por storage.js) =====
  const IDB = window.DS160?.imageStore || {
    async listImages(){ return []; },
    async getRecord(){ return null; },
    async deleteImage(){},
    async putFile(){},
  };

  // Render listado de imágenes
  async function renderList(){
    const cont = $('#imageList'); if (!cont) return;
    cont.innerHTML = '';
    const items = await IDB.listImages();
    if (!items.length){
      cont.innerHTML = '<div class="empty">No hay imágenes guardadas.</div>';
      return;
    }
    const frag = document.createDocumentFragment();
    items.forEach(rec=>{
      const row = document.createElement('div');
      row.className = 'image-row';
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = `${rec.name||'(sin nombre)'} — ${asNumber(rec.size)||0} bytes`;
      const actions = document.createElement('div');
      actions.className = 'actions';

      const btnView = document.createElement('button');
      btnView.type = 'button';
      btnView.textContent = 'Ver';
      btnView.addEventListener('click', async ()=>{
        try{
          const r = await IDB.getRecord(rec.id);
          if (!r || !r.blob) return;
          if ((asNumber(r.size)||0) > PREVIEW_LIMIT){ setStatus('La imagen es muy grande para vista previa.'); return; }
          const url = URL.createObjectURL(r.blob);
          try{ window.open(url, '_blank'); }finally{
            setTimeout(()=>URL.revokeObjectURL(url), 15000);
          }
        }catch(err){ console.error(err); setStatus('No se pudo abrir la imagen.'); }
      });

      const btnDownload = document.createElement('button');
      btnDownload.type = 'button';
      btnDownload.textContent = 'Descargar';
      btnDownload.addEventListener('click', async ()=>{
        try{
          const r = await IDB.getRecord(rec.id);
          if (!r || !r.blob) return;
          if ((asNumber(r.size)||0) > DOWNLOAD_LIMIT){ setStatus('La imagen es muy grande para descargar directa.'); return; }
          const url = URL.createObjectURL(r.blob);
          try{
            const a = document.createElement('a');
            a.href = url; a.download = rec.name || 'imagen';
            document.body.appendChild(a); a.click(); a.remove();
          }finally{
            setTimeout(()=>URL.revokeObjectURL(url), 15000);
          }
        }catch(err){ console.error(err); setStatus('No se pudo descargar la imagen.'); }
      });

      const btnDelete = document.createElement('button');
      btnDelete.type = 'button';
      btnDelete.textContent = 'Eliminar';
      btnDelete.addEventListener('click', async ()=>{
        try{
          await IDB.deleteImage(rec.id);
          await renderList();
        }catch(err){ console.error(err); setStatus('No se pudo eliminar.'); }
      });

      actions.appendChild(btnView);
      actions.appendChild(btnDownload);
      actions.appendChild(btnDelete);
      row.appendChild(meta);
      row.appendChild(actions);
      frag.appendChild(row);
    });
    cont.appendChild(frag);
  }

  // Progreso UI
  function setProgress(valPct, label){
    const bar = $('#progressBar'); const lab = $('#progressLabel');
    if (bar) bar.style.width = `${Math.max(0, Math.min(100, Number(valPct)||0))}%`;
    if (lab) lab.textContent = label||'';
  }

  // ===== Bindings =====
  function bind(form){
    // Título
    const h1 = $('h1');
    if (h1 && h1.textContent.trim()!==PAGE_TITLE) h1.textContent = PAGE_TITLE;

    // Radios fijadas a "No" y ocultas
    const otherNames = $('[name="OtherNames"]', form);
    const telecode = $('[name="TelecodeQuestion"]', form);
    if (otherNames){ otherNames.value='No'; otherNames.closest('.row')?.classList.add('hidden'); }
    if (telecode){ telecode.value='No'; telecode.closest('.row')?.classList.add('hidden'); }

    // Ocultar "No aplica" de Estado/Provincia y de Nombre nativo
    $('#POB_STATE_NA')?.closest('.row')?.classList.add('hidden');
    $('#APP_FULL_NAME_NATIVE_NA')?.closest('.row')?.classList.add('hidden');

    // Autocompletar "Nombre completo en alfabeto nativo"
    const givenEl = $('#APP_GIVEN_NAME', form);
    const surnEl  = $('#APP_SURNAME', form);
    const nativeEl= $('#APP_FULL_NAME_NATIVE', form);
    const updateNative = ()=>{
      const full = normalizeName([givenEl?.value||'', surnEl?.value||''].join(' '));
      if (nativeEl) nativeEl.value = full;
    };
    givenEl?.addEventListener('input', updateNative);
    surnEl?.addEventListener('input', updateNative);
    updateNative();

    // Botones
    $('#clearBtn')?.addEventListener('click', ()=>{
      try{
        form.reset();
        sessionStorage.removeItem(FORM_KEY);
        sessionStorage.removeItem(FORM_KEY_RAW);
        Array.from(form.querySelectorAll('input, select, textarea')).forEach(el=>{
          el.dispatchEvent(new Event('change',{bubbles:true}));
          el.dispatchEvent(new Event('input',{bubbles:true}));
        });
        mergeIntoMaster();
        setStatus('Limpio');
      }catch(e){ console.error(e); }
    });

    $('#nextBtn')?.addEventListener('click', ()=>{
      saveFormState(form);
      mergeIntoMaster();
      if (!isFormValid(form)){
        setStatus('Completa los campos requeridos.');
        return;
      }
      setStatus('');
      goNext();
    });

    // Cambios
    let lastSnap='';
    form.addEventListener('input', debounce(()=>{
      try{
        const norm = collectNormalized(form);
        const snap = JSON.stringify(norm);
        if (snap!==lastSnap){
          sessionStorage.setItem(FORM_KEY, snap);
          sessionStorage.setItem(FORM_KEY_RAW, JSON.stringify(collectRaw(form)));
          lastSnap = snap;
          mergeIntoMaster();
        }
      }catch(e){ console.warn('input handler', e); }
    }, 250));
  }

  // ===== Inicialización =====
  function init(){
    const form = document.getElementById(FORM_ID);
    if (!form){ console.error('Form no encontrado'); return; }
    bind(form);
    restoreFormState(form);
    renderList().catch(()=>{});
  }

  document.addEventListener('DOMContentLoaded', init);

  // === Bridge: recibe datos del panel padre ===
  window.addEventListener('message', (e) => {
    try{
      const msg = e && e.data;
      if (!msg || msg.type !== 'ds160:set') return;
      const payload = msg.payload || {};
      const data = payload.data || {};
      // 1) Actualiza maestro completo
      try { sessionStorage.setItem('ds160-all', JSON.stringify(data||{})); } catch {}
      // 2) Hidrata esta página si viene su sección
      const section = (data.forms && data.forms['ds160-personal1']) ? data.forms['ds160-personal1'] : {};
      // Normaliza nombres si faltan
      if (section && typeof section==='object'){
        if (!section.APP_SURNAME){
          section.APP_SURNAME = data.APP_SURNAME || data.app_surname || '';
        }
        if (!section.APP_GIVEN_NAME){
          section.APP_GIVEN_NAME = data.APP_GIVEN_NAME || data.app_given_name || '';
        }
        if (!section.full_name && section.APP_GIVEN_NAME && section.APP_SURNAME){
          section.full_name = section.APP_GIVEN_NAME + ' ' + section.APP_SURNAME;
        }
      }
      const form = document.getElementById('ds160-personal1');
      if (form && section && typeof section === 'object'){
        try{
          sessionStorage.setItem('ds160-personal1-state-v3', JSON.stringify(section));
          sessionStorage.setItem('ds160-personal1-raw-v3', JSON.stringify(section));
        }catch{}
        // reutiliza lógica existente de restauración
        try { restoreFormState(form); } catch (err) { console.warn('restoreFormState error:', err); }
        try { mergeIntoMaster(); } catch {}
      }
      // Confirma listo
      try{ parent && parent.postMessage({ type:'ds160:ready' }, '*'); }catch{}
    }catch(err){ console.warn('bridge ds160:set', err); }
  }, false);

  // avisa al padre por si necesita reenviar al cargar
  try{ parent && parent.postMessage({ type:'ds160:ready' }, '*'); }catch{}

})();
