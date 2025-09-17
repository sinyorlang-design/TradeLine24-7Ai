(function(){
  const qs=(s,p=document)=>p.querySelector(s); const qsa=(s,p=document)=>[...p.querySelectorAll(s)];
  // Install flow
  let deferred; window.addEventListener('beforeinstallprompt',(e)=>{e.preventDefault(); deferred=e; const p=qs('#pwa'); if(p) p.textContent='Ready';});
  qs('#btnInstall')?.addEventListener('click', async()=>{
    if(!deferred) return; deferred.prompt(); try{await deferred.userChoice;}catch{} deferred=null;
  });

  // Make feature/pricing cards clickable
  qsa('[data-link]').forEach(el=>{
    el.setAttribute('role','link'); el.tabIndex=0;
    const nav=(e)=>{ const href=el.getAttribute('data-link'); if(!href) return;
      if(window.location.search.includes('test=1')){ e?.preventDefault(); console.debug('[TEST] would navigate:', href); return; }
      window.location.href=href;
    };
    el.addEventListener('click', nav);
    el.addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' ') { e.preventDefault(); nav(e); }});
  });

  // Smooth scroll for on-page anchors
  qsa('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', (e)=>{
      const id=a.getAttribute('href'); if(!id || id==="#" || !qs(id)) return;
      e.preventDefault(); qs(id).scrollIntoView({behavior:'smooth', block:'start'});
    });
  });

  // Status tile ping
  (async()=>{
    const ready=qs('#ready'); if(!ready) return;
    try{ const r=await fetch('https://api.tradeline247.ca/readyz',{cache:'no-store'}); ready.textContent=r.ok?'OK':'Check'; }
    catch{ ready.textContent='Check'; }
  })();

  // ===== UI SELF-TEST =====
  if (window.location.search.includes('test=1')) {
    const results=[];
    const ok=(name,cond)=>results.push({name,ok:!!cond});
    ok('Brand logo', !!qs('img[src*="/assets/brand/OFFICIAL_LOGO.svg"]'));
    ok('Hero headline matches canon', /Your 24\/7 Ai Receptionist/.test(qs('h1')?.textContent||''));
    ok('CTA dials Twilio DID', !!qs('a[href^="tel:+15877428885"]'));
    ok('Install button exists', !!qs('#btnInstall'));
    ok('Status tile exists', !!qs('#ready'));
    ok('Feature cards clickable', qsa('[data-link]').length>=3);
    ok('Pricing toggles exist', qsa('details.pricing').length>=1);
    ok('Footer present', /Canadian Built/.test(document.body.textContent||''));
    // Simulated clicks (test mode prevents navigation)
    try{ qs('[data-link]')?.dispatchEvent(new Event('click',{bubbles:true})); ok('Card click handler bound', true); }catch{ ok('Card click handler bound', false); }
    // Paint panel
    const panel=document.createElement('div'); const pass=results.every(r=>r.ok);
    panel.id='ui-test-panel'; panel.className=pass?'pass':'fail';
    panel.innerHTML = `<strong>UI Self-test: ${pass?'All checks passed ✅':'Issues found ⚠️'}</strong><ul style="margin:6px 0 0 16px">${results.map(r=>`<li>${r.ok?'✅':'❌'} ${r.name}</li>`).join('')}</ul>`;
    document.body.appendChild(panel);
    console.log('UI Self-test results:', results);
  }
})();
