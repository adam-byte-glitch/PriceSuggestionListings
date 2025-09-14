(function(){
  const $ = (sel, root=document) => root.querySelector(sel);
  const el = (tag, cls) => { const n=document.createElement(tag); if(cls) n.className=cls; return n; };

  // App state and simple derived values
  const state = {
    monthly: { value: null, enabled: true, recommended: 200 },
    daily:   { value: 18,  enabled: true, expandedOnce: false },
    hybrid:  { value: 97,  enabled: true, expandedOnce: false },
    // Coefficients derived from the design to match example numbers when monthly=$200
    coeff: { dailyAfterFeesPerMonthly: 0.06375, weeklyAfterFeesPerMonthly: 0.3926, monthlyAfterFeesPerMonthly: 1.78495 },
    earningsExpanded: false,
  };

  const format = (n) => n.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2});
  const isMonthlySet = () => typeof state.monthly.value === 'number' && isFinite(state.monthly.value) && state.monthly.value > 0;
  const COMMISSION_RATE = 0.30; // 30% platform commission
  const NET_MULTIPLIER = 1 - COMMISSION_RATE; // 70% to host
  // Time conversion factors
  const DAYS_PER_WEEK = 7;
  const WEEKS_PER_YEAR = 52;
  const MONTHS_PER_YEAR = 12;
  const DAYS_PER_YEAR = 365;
  const WEEKS_PER_MONTH = WEEKS_PER_YEAR / MONTHS_PER_YEAR; // ~4.3333
  const DAYS_PER_MONTH = DAYS_PER_YEAR / MONTHS_PER_YEAR;   // ~30.4167

  function makeToggle(initial, onChange){
    const t = el('div','toggle'+(initial?' on':''));
    t.addEventListener('click',()=>{ t.classList.toggle('on'); onChange(t.classList.contains('on')); });
    return t;
  }

  function computeFromMonthly(){
    if (!isMonthlySet()) return;
    state.daily.value  = +(state.monthly.value * 0.09).toFixed(2);
    state.hybrid.value = +(state.monthly.value * 0.485).toFixed(2);
  }

  function renderMonthly(){
    const root = $('#card-monthly');
    root.innerHTML = '';

    const header = el('div','card-header');
    const left = el('div');
    const h = el('h2','section-title'); h.textContent = 'Configure Monthly Price';
    const sub = el('p','subtext'); sub.textContent = 'Add the price of the monthly booking';
    left.append(h, sub);

    const hasValue = isMonthlySet();
    if (hasValue && state.monthly.enabled) {
      const enabledChip = el('span','chip success'); enabledChip.textContent = 'Enabled';
      left.append(enabledChip);
    } else if (hasValue && !state.monthly.enabled) {
      const disabledChip = el('span','chip disabled'); disabledChip.textContent = 'Disabled';
      left.append(disabledChip);
    }

    // Always show toggle
    const toggle = makeToggle(state.monthly.enabled, (on)=>{
      state.monthly.enabled=on; root.classList.toggle('is-disabled', !on); renderMonthly();
    });
    header.append(left, toggle);

    const top = el('div','input-row');
    const priceRow = el('div','price-row');
    const dollar = el('span','price');

    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.placeholder = '00.00';
    input.value = hasValue ? state.monthly.value.toFixed(2) : '';
    input.className = 'price-input';

    const resize = () => {
      const text = (input.value || input.placeholder);
      input.style.width = Math.max(1, text.length) + 'ch';
    };
    resize();

    input.addEventListener('input', () => {
      const cleaned = input.value.replace(/[^0-9.]/g,'');
      if (cleaned !== input.value) input.value = cleaned;
      const v = parseFloat(cleaned);
      if (!isNaN(v)) {
        state.monthly.value = v;
        computeFromMonthly();
        renderDaily();
        renderHybrid();
        renderEarnings();
      } else {
        state.monthly.value = null;
        root.classList.remove('is-disabled');
      }
      resize();
    });

    input.addEventListener('blur', () => { renderMonthly(); });
    input.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ input.blur(); }});

    dollar.textContent = '$';
    priceRow.append(dollar, input);

    let statusChip;
    if (hasValue) {
      const matches = Math.abs(state.monthly.value - state.monthly.recommended) < 0.005;
      const isLow = state.monthly.value < state.monthly.recommended;
      statusChip = el('span','chip ' + (matches ? 'success' : (isLow ? 'danger' : '')));
      if (matches) statusChip.textContent = 'Price matches market rate';
      else if (isLow) statusChip.textContent = 'Price rate too low';
    }

    const reco = el('p','reco');
    reco.innerHTML = `Recommended: <strong>$${format(state.monthly.recommended)}</strong>`;

    top.append(priceRow);

    const link = el('a','link'); link.href='#'; link.textContent='Learn how the market rate is determined';
    // Tooltip container
    const tip = el('div','tooltip-panel');
    tip.innerHTML = `
      <h4>How Is Your Market Rate Calculated?</h4>
      <div>We estimate your recommended price using:</div>
      <ul>
        <li>Local market data</li>
        <li>Including nearby listing</li>
        <li>Historical occupancy</li>
        <li>Neighborhood demand trends.</li>
      </ul>
      <div style="margin-top:8px">By factoring in these geographical details, we help you stay competitively priced without undercutting your earnings.</div>
    `;
    link.appendChild(tip);
    const showTip = ()=>{ tip.style.display='block'; };
    const hideTip = ()=>{ tip.style.display='none'; };
    link.addEventListener('mouseenter', showTip);
    link.addEventListener('mouseleave', hideTip);
    link.addEventListener('click', (e)=>{ e.preventDefault(); tip.style.display = tip.style.display==='block' ? 'none' : 'block'; });

    root.append(header);
    if (state.monthly.enabled) {
      root.append(top);
    }
    root.append(reco);
    if (statusChip && statusChip.textContent) {
      const row = el('div','status-row');
      row.append(statusChip);
      root.append(row);
    }
    root.append(link);

    root.classList.toggle('is-disabled', !state.monthly.enabled);
  }

  function renderDaily(){
    const root = $('#card-daily'); root.innerHTML='';

    const hasMonthly = isMonthlySet();

    const header = el('div','card-header');
    const left = el('div');
    if (!hasMonthly) {
      const title = el('div','title-muted'); title.textContent = 'Daily Price';
      left.append(title);
    } else {
      const h = el('h2','section-title'); h.textContent='Configure Daily Price';
      const sub = el('p','subtext'); sub.textContent='The daily price is calculated based on your monthly rate. You may adjust this as preferred.';
      left.append(h, sub);
      const chip = el('span','chip ' + (state.daily.enabled ? 'success' : 'disabled'));
      chip.textContent = state.daily.enabled ? 'Enabled' : 'Disabled';
      left.append(chip);
    }
    if (hasMonthly) {
      const toggle = makeToggle(state.daily.enabled,(on)=>{ state.daily.enabled=on; renderDaily(); });
      header.append(left, toggle);
    } else {
      header.append(left);
    }

    root.classList.toggle('is-disabled', !hasMonthly || !state.daily.enabled);

    // Render price row only after monthly is set and toggle is on
    if (hasMonthly && state.daily.enabled) {
      const top = el('div','input-row');
      const price = el('div','price-row');
      const dollar = el('span','price'); dollar.textContent = '$';
      const input = document.createElement('input');
      input.type = 'text'; input.inputMode='decimal'; input.className='price-input';
      input.value = state.daily.value.toFixed(2);
      const resize = ()=>{ const t=input.value||input.placeholder||''; input.style.width=Math.max(1,t.length)+'ch'; };
      resize();
      input.addEventListener('input',()=>{
        const cleaned = input.value.replace(/[^0-9.]/g,'');
        if (cleaned !== input.value) input.value = cleaned;
        const v = parseFloat(cleaned);
        if (!isNaN(v)) { state.daily.value = v; renderEarnings(); }
        resize();
      });
      const u = el('span','unit'); u.textContent = '/day';
      price.append(dollar,input,u);
      top.append(price);
      root.append(header, top);
    } else {
      root.append(header);
    }
  }

  function renderHybrid(){
    const root = $('#card-hybrid'); root.innerHTML='';

    const hasMonthly = isMonthlySet();

    const header = el('div','card-header');
    const left = el('div');
    if (!hasMonthly) {
      const title = el('div','title-muted'); title.textContent = 'Hybrid Price';
      left.append(title);
    } else {
      const h = el('h2','section-title'); h.textContent='Configure Hybrid Price';
      const sub = el('p','subtext'); sub.textContent='The hybrid price is calculated based on your monthly rate. You may adjust this as preferred.';
      left.append(h, sub);
      const chip = el('span','chip ' + (state.hybrid.enabled ? 'success' : 'disabled'));
      chip.textContent = state.hybrid.enabled ? 'Enabled' : 'Disabled';
      left.append(chip);
    }
    if (hasMonthly) {
      const toggle = makeToggle(state.hybrid.enabled,(on)=>{ state.hybrid.enabled=on; renderHybrid(); });
      header.append(left, toggle);
    } else {
      header.append(left);
    }

    root.classList.toggle('is-disabled', !hasMonthly || !state.hybrid.enabled);

    if (hasMonthly && state.hybrid.enabled) {
      const top = el('div','input-row');
      const price = el('div','price-row');
      const dollar = el('span','price'); dollar.textContent = '$';
      const input = document.createElement('input');
      input.type='text'; input.inputMode='decimal'; input.className='price-input';
      input.value = state.hybrid.value.toFixed(2);
      const resize = ()=>{ const t=input.value||input.placeholder||''; input.style.width=Math.max(1,t.length)+'ch'; };
      resize();
      input.addEventListener('input',()=>{
        const cleaned = input.value.replace(/[^0-9.]/g,'');
        if (cleaned !== input.value) input.value = cleaned;
        const v = parseFloat(cleaned);
        if (!isNaN(v)) { state.hybrid.value = v; renderEarnings(); }
        resize();
      });
      const u = el('span','unit'); u.textContent = '/week';
      price.append(dollar,input,u);
      top.append(price);
      root.append(header, top);
    } else {
      root.append(header);
    }
  }

  function renderEarnings(){
    const root = $('#card-earnings'); root.innerHTML='';
    const h = el('h2','section-title'); h.textContent='Potential Earnings';
    const sub = el('p','subtext text-muted-65'); sub.textContent='These projections assume 100% occupancy rate. Actual earnings may vary.';

    const monthlySet = isMonthlySet();
    // Compute net values from configured prices using 30% commission
    const dayNet = monthlySet ? +(state.daily.value * NET_MULTIPLIER).toFixed(2) : null;
    const weekNet = monthlySet ? +(state.hybrid.value * NET_MULTIPLIER).toFixed(2) : null;
    const monthNet = monthlySet ? +(state.monthly.value * NET_MULTIPLIER).toFixed(2) : null;

    const content = el('div');
    if (!state.earningsExpanded) {
      const pills = el('div','earnings-cards');
      const pill = (cls, title, amount, suffix) => {
        const a = el('div',`e-pill ${cls}`);
        const t = el('div','e-title'); t.textContent=title;
        const v = el('div','e-amt'); v.textContent= monthlySet ? `$${format(amount)}` : '—';
        const s = el('div','e-sub'); s.textContent=suffix;
        a.append(t,v,s); return a;
      };
      pills.append(
        pill('daily','Daily', dayNet, 'After platform fees'),
        pill('hybrid','Hybrid', weekNet, 'After platform fees'),
        pill('monthly','Monthly', monthNet, 'After platform fees')
      );
      content.append(pills);
    } else {
      const breakdown = el('div','breakdown');
      const row = (cls, title, d,w,m,y) => {
        const r = el('div',`row ${cls}`);
        const t = el('div','title'); t.textContent = title; r.appendChild(t);
        const c1 = el('div','cell col-1');
        const v1 = el('div','value'); v1.textContent = monthlySet ? `$${format(d)}` : '—';
        const s1 = el('div','sublabel'); s1.textContent = '/day';
        c1.append(v1, s1);

        const c2 = el('div','cell col-2');
        const v2 = el('div','value'); v2.textContent = monthlySet ? `$${format(w)}` : '—'; const s2 = el('div','sublabel'); s2.textContent='/week'; c2.append(v2,s2);
        const c3 = el('div','cell col-3');
        const v3 = el('div','value'); v3.textContent = monthlySet ? `$${format(m)}` : '—'; const s3 = el('div','sublabel'); s3.textContent='/month'; c3.append(v3,s3);
        const c4 = el('div','cell col-4');
        const v4 = el('div','value'); v4.textContent = monthlySet ? `$${format(y)}` : '—'; const s4 = el('div','sublabel'); s4.textContent='/year'; c4.append(v4,s4);

        r.append(c1,c2,c3,c4);
        return r;
      };
      if (monthlySet) {
        const dailyRow = {
          day: dayNet,
          week: dayNet * DAYS_PER_WEEK,
          month: dayNet * DAYS_PER_MONTH,
          year: dayNet * DAYS_PER_YEAR,
        };
        const hybridRow = {
          day: weekNet / DAYS_PER_WEEK,
          week: weekNet,
          month: weekNet * WEEKS_PER_MONTH,
          year: weekNet * WEEKS_PER_YEAR,
        };
        const monthlyRow = {
          day: monthNet / DAYS_PER_MONTH,
          week: monthNet / WEEKS_PER_MONTH,
          month: monthNet,
          year: monthNet * MONTHS_PER_YEAR,
        };
        breakdown.append(
          row('daily','Daily Parking',dailyRow.day, dailyRow.week, dailyRow.month, dailyRow.year),
          row('hybrid','Hybrid Parking',hybridRow.day, hybridRow.week, hybridRow.month, hybridRow.year),
          row('monthly','Monthly Parking',monthlyRow.day, monthlyRow.week, monthlyRow.month, monthlyRow.year)
        );
      } else {
        breakdown.append(
          row('daily','Daily Parking',null,null,null,null),
          row('hybrid','Hybrid Parking',null,null,null,null),
          row('monthly','Monthly Parking',null,null,null,null)
        );
      }
      content.append(breakdown);
    }

    const actions = el('div','actions');
    const btn = el('button','toggle-link'); btn.type='button';
    const icon = el('span','toggle-icon');
    const label = document.createElement('span'); label.className = 'toggle-label';
    // Set icon glyph based on current state
    icon.textContent = state.earningsExpanded ? '–' : '+';
    label.textContent = state.earningsExpanded ? 'hide comprehensive breakdown' : 'Show comprehensive breakdown';
    btn.append(icon,label);
    btn.addEventListener('click',()=>{ state.earningsExpanded = !state.earningsExpanded; renderEarnings(); });
    actions.append(btn);

    root.append(h, sub, content, actions);
  }

  function renderInfo(){
    const root = $('#card-info');
    root.innerHTML = `
      <h3 class="section-title" style="font-size:24px">You earn 70% of every dollar made.</h3>
      <div class="subtext" style="font-size:16px;color:#5F7287">We handle the hard stuff so you can earn hassle-free.</div>
      <ul style="margin:16px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:16px">
        <li><strong style="color:#0096b6">Listing Promotion</strong><br/><span class="subtext" style="color:var(--navy-10)">We advertise your spot so more parkers find and book your spot.</span></li>
        <li><strong style="color:#0096b6">24/7 Support</strong><br/><span class="subtext">We assist you and your parkers, handling questions and issues.</span></li>
        <li><strong style="color:#0096b6">Secure Payments</strong><br/><span class="subtext">Get paid in full, on time—no chasing payments, ever.</span></li>
      </ul>
    `;
  }

  // Initial render
  renderMonthly();
  renderDaily();
  renderHybrid();
  renderEarnings();
  renderInfo();
})();
