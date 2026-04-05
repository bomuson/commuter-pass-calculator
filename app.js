// --- Utilities ---
  const yen = n => new Intl.NumberFormat('ja-JP', { style:'currency', currency:'JPY', maximumFractionDigits:0 }).format(n);
  const clampInt = v => Math.max(0, Math.round(Number(v)||0));
  function ymd(d){ const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${dd}`; }
  function parseDate(s){ const m=String(s||'').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/); if(!m) return null; const d=new Date(+m[1], +m[2]-1, +m[3], 12); return isNaN(d)?null:d; }
  function addMonthsAndMinusOneDay(start, months=1){ const s=new Date(start.getFullYear(), start.getMonth(), start.getDate(), 12); const end=new Date(s.getFullYear(), s.getMonth()+months, s.getDate(), 12); end.setDate(end.getDate()-1); return end; }
  function* eachDate(from, to){ const d=new Date(from.getFullYear(), from.getMonth(), from.getDate(), 12); while(d<=to){ yield new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12); d.setDate(d.getDate()+1); } }
  function isWeekday(d){ const w=d.getDay(); return w!==0 && w!==6; }
  function isMonFri(d){ const w=d.getDay(); return w>=1 && w<=5; }

  // --- Japanese Holidays (1980-2099) ---
  // Based on Cabinet Office rules: Happy Monday, Equinox formulas (approx) and substitute/citizens' holiday.
  function vernalEquinoxDay(year){ // 春分日 (approx valid 1980-2099)
    return Math.floor(20.8431 + 0.242194 * (year - 1980)) - Math.floor((year - 1980)/4);
  }
  function autumnalEquinoxDay(year){ // 秋分日 (approx valid 1980-2099)
    return Math.floor(23.2488 + 0.242194 * (year - 1980)) - Math.floor((year - 1980)/4);
  }
  function nthMonday(year, month, n){ // 0-based month
    const d = new Date(year, month, 1, 12);
    const add = (1 - d.getDay() + 7) % 7; // first Monday offset
    return 1 + add + (n-1)*7;
  }
  function japaneseHolidaysMap(year){
    const map = new Map(); // 'YYYY-MM-DD' -> name
    function set(y,m,d,name){ map.set(`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`, name); }
    // Fixed
    set(year, 0, 1, "元日");
    set(year, 1, 11, "建国記念の日");
    set(year, 1, 23, "天皇誕生日"); // 2020〜（現天皇）
    set(year, 3, 29, "昭和の日");
    set(year, 4, 3, "憲法記念日");
    set(year, 4, 4, "みどりの日");
    set(year, 4, 5, "こどもの日");
    set(year, 7, 11, "山の日");
    set(year, 10, 3, "文化の日");
    set(year, 10, 23, "勤労感謝の日");
    // Happy Monday
    set(year, 0, nthMonday(year,0,2), "成人の日");        // 1月 第2月曜
    set(year, 6, nthMonday(year,6,3), "海の日");          // 7月 第3月曜
    set(year, 8, nthMonday(year,8,3), "敬老の日");        // 9月 第3月曜
    set(year, 9, nthMonday(year,9,2), "スポーツの日");    // 10月 第2月曜
    // Equinox
    set(year, 2, vernalEquinoxDay(year), "春分の日");
    set(year, 8, autumnalEquinoxDay(year), "秋分の日");

    // Golden Week in-between ("国民の休日"): May 4 is already Greenery Day (since 2007)
    // Citizens' holiday rule (挟み込み): Any non-holiday weekday sandwiched between two holidays becomes a holiday.
    // We'll compute it after initial set.

    // Substitute holidays (振替休日): When a holiday falls on Sunday, the next non-holiday weekday becomes holiday.
    // We'll compute after citizens' holidays.
    return map;
  }
  function applyCitizensAndSubstitute(year, baseMap){
    // Clone to set for check
    const isHoliday = (d)=> baseMap.has(ymd(d));
    // Citizens' holiday: scan the whole year
    for(let m=0;m<12;m++){
      const last = new Date(year, m+1, 0, 12).getDate();
      for(let day=2; day<=last-1; day++){
        const d0 = new Date(year, m, day-1, 12);
        const d1 = new Date(year, m, day, 12);
        const d2 = new Date(year, m, day+1, 12);
        if (isWeekday(d1) && !isHoliday(d1) && isHoliday(d0) && isHoliday(d2)){
          baseMap.set(ymd(d1), "国民の休日");
        }
      }
    }
    // Substitute: for any Sunday holiday, next non-holiday weekday
    for(let m=0;m<12;m++){
      const last = new Date(year, m+1, 0, 12).getDate();
      for(let day=1; day<=last; day++){
        const d = new Date(year, m, day, 12);
        if (d.getDay()===0 && baseMap.has(ymd(d))){ // Sunday & holiday
          // find next non-holiday weekday
          const sub = new Date(d.getFullYear(), d.getMonth(), d.getDate()+1, 12);
          while(sub.getDay()===0 || baseMap.has(ymd(sub))){ // if Monday also holiday, push forward
            sub.setDate(sub.getDate()+1);
          }
          // Only weekdays matter, but if it's Saturday, continue to Monday
          while(sub.getDay()===6){ sub.setDate(sub.getDate()+2); }
          baseMap.set(ymd(sub), "振替休日");
        }
      }
    }
    return baseMap;
  }
  function getHolidaysForRange(from, to){
    const years = new Set([from.getFullYear(), to.getFullYear()]);
    const map = new Map();
    for(const y of years){
      const base = japaneseHolidaysMap(y);
      const full = applyCitizensAndSubstitute(y, base);
      for(const [k,v] of full){
        const d = parseDate(k);
        if (d >= from && d <= to){
          map.set(k,v);
        }
      }
    }
    return map; // 'YYYY-MM-DD' -> name
  }

  // --- State ---
  const selected = new Set(); // 'YYYY-MM-DD'
  let passStart = null, passEnd = null;
  let holidays = new Map();  // 'YYYY-MM-DD' -> name

  const els = {
    passPrice: document.getElementById('passPrice'),
    fare: document.getElementById('roundTripFare'),
    purchase: document.getElementById('purchaseDate'),
    calendarCard: document.getElementById('calendarCard'),
    calendarWrap: document.getElementById('calendarWrap'),
    passTermPreview: document.getElementById('passTermPreview'),
    breakevenPreview: document.getElementById('breakevenPreview'),
    selectedInfo: document.getElementById('selectedInfo'),
    resultSummary: document.getElementById('resultSummary'),
    detailTable: document.getElementById('detailTable'),
    buildCalendarBtn: document.getElementById('buildCalendarBtn'),
    selectAllWeekdays: document.getElementById('selectAllWeekdays'),
    selectMonFri: document.getElementById('selectMonFri'),
    clearAll: document.getElementById('clearAll'),
    calcBtn: document.getElementById('calcBtn'),
    saveDefaultsBtn: document.getElementById('saveDefaultsBtn'),
    clearDefaultsBtn: document.getElementById('clearDefaultsBtn'),
    defaultsStatus: document.getElementById('defaultsStatus')
  };


  const STORAGE_KEY = 'commuterFareDefaults_v1';

  function loadDefaults(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw){
        updateDefaultsStatus(false);
        return;
      }
      const data = JSON.parse(raw);
      if(data && (data.passPrice !== undefined || data.roundTripFare !== undefined)){
        if(data.passPrice !== undefined && data.passPrice !== null) els.passPrice.value = data.passPrice;
        if(data.roundTripFare !== undefined && data.roundTripFare !== null) els.fare.value = data.roundTripFare;
        updateDefaultsStatus(true, data);
      }else{
        updateDefaultsStatus(false);
      }
    }catch(e){
      updateDefaultsStatus(false);
    }
  }

  function saveDefaults(){
    const passPrice = clampInt(els.passPrice.value);
    const roundTripFare = clampInt(els.fare.value);
    const data = { passPrice, roundTripFare };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    updateDefaultsStatus(true, data);
    updateBreakevenPreview();
    alert('初期値を保存しました。次回以降、この端末のブラウザで自動入力されます。');
  }

  function clearDefaults(){
    localStorage.removeItem(STORAGE_KEY);
    updateDefaultsStatus(false);
    alert('保存した初期値を削除しました。');
  }

  function updateDefaultsStatus(saved, data=null){
    if(saved && data){
      els.defaultsStatus.textContent = `保存済みの初期値：定期券料金 ${yen(Number(data.passPrice || 0))} ／ 往復料金 ${yen(Number(data.roundTripFare || 0))}`;
    }else{
      els.defaultsStatus.textContent = '初期値はまだ保存されていません';
    }
  }

  function updatePassTermPreview(){
    const ps = els.purchase.value;
    if(!ps){ els.passTermPreview.textContent = '—'; passStart = passEnd = null; return; }
    const d = parseDate(ps); if(!d){ els.passTermPreview.textContent = '—'; passStart = passEnd = null; return; }
    passStart = d;
    passEnd = addMonthsAndMinusOneDay(d, 1);
    const days = Math.floor((passEnd - passStart)/(1000*60*60*24))+1;
    els.passTermPreview.textContent = `${ymd(passStart)} ～ ${ymd(passEnd)}（${days}日間）`;
  }

  function updateBreakevenPreview(){
    const pp = clampInt(els.passPrice.value);
    const fr = clampInt(els.fare.value);
    els.breakevenPreview.textContent = (pp && fr) ? `${Math.ceil(pp / fr)} 日` : '—';
  }

  function makeMonthBlock(year, month){
    const wrap = document.createElement('div');
    wrap.className = 'month';
    const title = document.createElement('h3');
    title.textContent = `${year}年 ${month+1}月`;
    wrap.appendChild(title);

    const wk = document.createElement('div');
    wk.className = 'wk';
    wk.innerHTML = '<div>日</div><div>月</div><div>火</div><div>水</div><div>木</div><div>金</div><div>土</div>';
    wrap.appendChild(wk);

    const grid = document.createElement('div');
    grid.className = 'grid';
    wrap.appendChild(grid);

    const first = new Date(year, month, 1, 12);
    const startPad = (first.getDay()+7)%7;
    const lastDate = new Date(year, month+1, 0, 12).getDate();
    const totalCells = Math.ceil((startPad + lastDate) / 7) * 7;

    for(let i=0;i<totalCells;i++){
      const cell = document.createElement('div'); cell.className = 'cell';
      if(i < startPad || i >= startPad + lastDate){
        cell.classList.add('disabled'); grid.appendChild(cell); continue;
      }
      const day = i - startPad + 1;
      const d = new Date(year, month, day, 12);
      const key = ymd(d);
      const dow = d.getDay();

      if(dow===0) cell.classList.add('sun');
      if(dow===6) cell.classList.add('sat');

      const inTerm = (d >= passStart && d <= passEnd);
      if(!inTerm){ cell.classList.add('disabled'); }

      const hname = holidays.get(key);
      if(hname){ cell.classList.add('holiday'); }

      const dSpan = document.createElement('div'); dSpan.className = 'd'; dSpan.textContent = day;
      const chk = document.createElement('input'); chk.type = 'checkbox'; chk.className = 'chk';
      chk.disabled = !inTerm;
      chk.checked = selected.has(key);
      chk.addEventListener('change', ()=>{
        if(chk.checked) selected.add(key); else selected.delete(key);
        updateSelectedInfo();
      });

      cell.appendChild(dSpan);
      if(hname){ const tag=document.createElement('div'); tag.className='hname'; tag.textContent=hname; cell.appendChild(tag); }
      cell.appendChild(chk);
      cell.addEventListener('click', (e)=>{ if(e.target!==chk && inTerm){ chk.checked = !chk.checked; chk.dispatchEvent(new Event('change')); } });

      grid.appendChild(cell);
    }
    return wrap;
  }

  function buildCalendar(){
    if(!passStart || !passEnd){ alert('先に購入日（開始日）を入力してください'); return; }
    holidays = getHolidaysForRange(passStart, passEnd);
    els.calendarWrap.innerHTML = '';

    // Render months intersecting the term
    const startY = passStart.getFullYear(), startM = passStart.getMonth();
    const endY = passEnd.getFullYear(), endM = passEnd.getMonth();
    let y = startY, m = startM;
    while(true){
      els.calendarWrap.appendChild(makeMonthBlock(y, m));
      if(y === endY && m === endM) break;
      m++; if(m>11){ m=0; y++; }
    }

    els.calendarCard.style.display = '';
    updateSelectedInfo();
  }

  function updateSelectedInfo(){
    let inside = 0;
    for(const s of selected){
      const d = parseDate(s);
      if(passStart && passEnd && d >= passStart && d <= passEnd) inside++;
    }
    els.selectedInfo.textContent = `選択済み：${inside} 日（定期内 ${inside}）`;
  }

  // Bulk operations (exclude holidays)
  function isHoliday(d){ return holidays.has(ymd(d)); }
  function selectAllWeekdaysExcludeHolidays(){
    for(const d of eachDate(passStart, passEnd)){ if(isWeekday(d) && !isHoliday(d)) selected.add(ymd(d)); }
    buildCalendar();
  }
  function clearAll(){
    selected.clear();
    buildCalendar();
  }

  // Calculation
  function calc(){
    const passPrice = clampInt(els.passPrice.value);
    const roundTripFare = clampInt(els.fare.value);
    if(!passPrice || !roundTripFare){
      els.resultSummary.innerHTML = "必要な項目が未入力です。定期券料金／往復料金を入力してください。";
      els.detailTable.style.display = "none"; return;
    }
    if(!passStart || !passEnd){
      els.resultSummary.innerHTML = "購入日（開始日）を入力し、カレンダーを生成してください。";
      els.detailTable.style.display = "none"; return;
    }

    const uniq = Array.from(selected).filter(s=>{
      const d = parseDate(s);
      return d && d >= passStart && d <= passEnd;
    }).sort();

    const covered = uniq.length;
    const ticketTotal = uniq.length * roundTripFare;
    const withPassTotal = passPrice;
    const diff = withPassTotal - ticketTotal; // >0: pass is worse
    const breakevenDays = Math.ceil(passPrice / roundTripFare);
    const passTerm = `${ymd(passStart)} ～ ${ymd(passEnd)}（${Math.floor((passEnd - passStart)/(1000*60*60*24))+1}日間）`;

    let verdict;
    if (withPassTotal < ticketTotal) verdict = `✅ <span class="good">定期券の方が ${yen(ticketTotal - withPassTotal)} お得</span> です。`;
    else if (withPassTotal > ticketTotal) verdict = `⚠️ <span class="bad">通常切符の方が ${yen(withPassTotal - ticketTotal)} お得</span> です。`;
    else verdict = `➖ 定期券も通常切符も<strong>同額</strong>の見込みです。`;

    els.resultSummary.innerHTML = `
      <div style="margin-bottom:6px">定期の有効期間：<span class="pill">${passTerm}</span></div>
      <div style="margin:6px 0 8px">${verdict}</div>
      <div class="small muted">※ 出勤日数：${uniq.length}日（すべて定期内）・損益分岐：定期内の出勤日が <strong>${breakevenDays} 日</strong> 以上で定期がお得</div>
    `;

    // details
    const tbody = els.detailTable.querySelector('tbody'); tbody.innerHTML='';
    function row(k, v){ const tr=document.createElement('tr'); const a=document.createElement('td'); const b=document.createElement('td'); a.textContent=k; b.textContent=v; tr.append(a,b); tbody.appendChild(tr); }
    row("通常切符（合計）", yen(ticketTotal));
    row("定期（合計）", yen(withPassTotal));
    row("差額（定期 − 通常切符）", `${diff >= 0 ? "+" : ""}${yen(diff)}`);
    row("出勤日数", `${uniq.length} 日（定期内 ${covered}）`);
    row("定期の有効期間", passTerm);
    row("損益分岐（必要な定期内の出勤日数）", `${breakevenDays} 日（= ceil(定期価格 ÷ 往復料金)）`);
    els.detailTable.style.display = "";
  }

  // Events
  els.buildCalendarBtn.addEventListener('click', ()=>{
    updatePassTermPreview();
    updateBreakevenPreview();
    if(!passStart || !passEnd){ alert('購入日（開始日）を正しく入力してください'); return; }
    buildCalendar();
  });
  els.passPrice.addEventListener('input', updateBreakevenPreview);
  els.fare.addEventListener('input', updateBreakevenPreview);
  els.clearAll.addEventListener('click', clearAll);
  els.selectAllWeekdays.addEventListener('click', selectAllWeekdaysExcludeHolidays);
    els.calcBtn.addEventListener('click', calc);
  els.saveDefaultsBtn.addEventListener('click', saveDefaults);
  els.clearDefaultsBtn.addEventListener('click', clearDefaults);

  // Init
  loadDefaults();
  updatePassTermPreview();
  updateBreakevenPreview();

(function(){
  const TUTORIAL_KEY = 'commuterTutorialSeen_v1';
  const overlay = document.getElementById('tutorialOverlay');
  const closeBtn = document.getElementById('tutorialCloseBtn');
  const showAgainBtn = document.getElementById('tutorialShowAgainBtn');
  function showTutorial(){ if (overlay) overlay.classList.add('show'); }
  function closeTutorial(saveSeen){
    if (saveSeen) localStorage.setItem(TUTORIAL_KEY, '1');
    if (overlay) overlay.classList.remove('show');
  }
  if (!localStorage.getItem(TUTORIAL_KEY)) showTutorial();
  if (closeBtn) closeBtn.addEventListener('click', function(){ closeTutorial(true); });
  if (showAgainBtn) showAgainBtn.addEventListener('click', function(){ closeTutorial(false); });
  if (overlay) {
    overlay.addEventListener('click', function(e){ if (e.target === overlay) closeTutorial(true); });
  }
})();
