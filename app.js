/* 入团积极分子刷题 App */
window.App = (() => {
  const $ = () => document.getElementById('app');
  const LS_STATS = 'brs_stats_v1';
  const LS_WRONG = 'brs_wrong_v1';
  const LS_DAILY = 'brs_daily_v1';
  const LS_GOAL = 'brs_goal_v1';

  const META = {
    single: { name: '单选题', icon: '🔘', count: QB.single.length, kind: 'choice' },
    multi:  { name: '多选题', icon: '☑️', count: QB.multi.length,  kind: 'choice' },
    judge:  { name: '判断题', icon: '⚖️', count: QB.judge.length,  kind: 'judge' },
    fill:   { name: '填空题', icon: '✍️', count: QB.fill.length,   kind: 'fill' },
    short:  { name: '简答题', icon: '📖', count: QB.short.length,  kind: 'short' },
  };

  // ---------- storage ----------
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const stats = load(LS_STATS, {});
  let wrong = load(LS_WRONG, {});
  const daily = load(LS_DAILY, {});
  let goal = load(LS_GOAL, 50);

  function idOf(type, idx) { return type + '-' + idx; }
  function parseId(id) { const i = id.lastIndexOf('-'); return { type: id.slice(0, i), idx: +id.slice(i + 1) }; }

  function record(id, ok) {
    const s = stats[id] || { t: 0, c: 0 };
    s.t += 1; if (ok) s.c += 1; stats[id] = s; save(LS_STATS, stats);
    if (ok) { delete wrong[id]; } else { wrong[id] = true; }
    save(LS_WRONG, wrong);
  }

  // ---------- 每日打卡 ----------
  function dateKey(d) {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const todayKey = () => dateKey(new Date());
  function bumpDaily(ok) {
    const k = todayKey();
    const d = daily[k] || { a: 0, c: 0 };
    d.a += 1; if (ok) d.c += 1;
    daily[k] = d; save(LS_DAILY, daily);
  }
  function calcStreak() {
    let streak = 0;
    let cur = new Date(); cur.setHours(0, 0, 0, 0);
    if (!daily[dateKey(cur)]) cur = new Date(cur.getTime() - 86400000);
    while (daily[dateKey(cur)]) { streak++; cur = new Date(cur.getTime() - 86400000); }
    return streak;
  }

  // ---------- utils ----------
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const shuffle = (a) => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
  const letters = (n) => Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
  const sortStr = (s) => String(s).split('').sort().join('');
  const seq = (n) => Array.from({ length: n }, (_, i) => i);

  // 打乱选项顺序，返回 { opts:[{v,text|label,emoji?}], correct }
  function setupOpts(type, item) {
    if (type === 'judge') {
      return { opts: [{ v: true, label: '对', emoji: '✅' }, { v: false, label: '错', emoji: '❌' }], correct: item.a };
    }
    const n = item.o.length;
    const perm = shuffle(seq(n));
    const ansIdx = (type === 'multi' ? item.a.split('') : [item.a]).map(c => c.charCodeAt(0) - 65);
    const opts = perm.map((origIdx, j) => ({ v: String.fromCharCode(65 + j), text: item.o[origIdx] }));
    const correct = perm.map((origIdx, j) => ansIdx.includes(origIdx) ? String.fromCharCode(65 + j) : null).filter(Boolean).sort().join('');
    return { opts, correct };
  }

  function gradeAnswer(type, setup, sel) {
    if (type === 'judge') return sel === setup.correct;
    return sortStr(sel) === sortStr(setup.correct);
  }
  function correctText(type, setup) {
    return type === 'judge' ? (setup.correct ? '对（正确）' : '错（错误）') : setup.correct;
  }

  // ---------- state ----------
  let view = 'home';
  const state = { prac: null, mem: null, exam: null };

  function go(v) { view = v; render(); window.scrollTo(0, 0); }

  // ---------- render ----------
  function render() {
    if (view === 'home') return renderHome();
    if (view === 'practice') return renderPractice();
    if (view === 'memorize') return renderMemorize();
    if (view === 'exam') return renderExam();
    if (view === 'wrong') return renderWrong();
    if (view === 'plan') return renderPlan();
    if (view === 'print') return renderPrint();
    if (view === 'sync') return renderSync();
  }

  // ---------- home ----------
  function renderHome() {
    const totalDone = Object.values(stats).reduce((n, s) => n + s.t, 0);
    const totalOk = Object.values(stats).reduce((n, s) => n + s.c, 0);
    const acc = totalDone ? Math.round((totalOk / totalDone) * 100) : 0;
    const wrongCount = Object.keys(wrong).length;
    const streakDays = calcStreak();

    let cards = '';
    for (const t of ['single', 'multi', 'judge', 'fill', 'short']) {
      const m = META[t];
      cards += `
        <div class="card" onclick="App.open('${t}')">
          <span class="badge">${m.count} 题</span>
          <div class="icon">${m.icon}</div>
          <h3>${m.name}</h3>
          <p>${descOf(t)}</p>
          <span class="tag">开始 →</span>
        </div>`;
    }

    $().innerHTML = `
      <div class="hero">
        <h2>👋 开始刷题吧</h2>
        <p>覆盖单选、多选、判断、填空、简答五大题型，题目与选项随机打乱，助你顺利通过入团考试。</p>
        <div class="stats">
          <div class="stat"><b>${totalDone}</b><span>已作答</span></div>
          <div class="stat"><b>${acc}%</b><span>正确率</span></div>
          <div class="stat"><b>${wrongCount}</b><span>待复习错题</span></div>
          <div class="stat"><b>${Object.values(QB).reduce((n, a) => n + a.length, 0)}</b><span>题目总数</span></div>
        </div>
      </div>
      <div class="grid">${cards}</div>
      <div class="grid" style="margin-top:14px">
        <div class="card" onclick="App.examSetup()">
          <span class="badge">随机组卷</span>
          <div class="icon">📝</div><h3>模拟考试</h3>
          <p>限时答题，检验复习成果</p><span class="tag">开始 →</span>
        </div>
        <div class="card" onclick="App.go('wrong')">
          <span class="badge">${wrongCount} 题</span>
          <div class="icon">📌</div><h3>错题本</h3>
          <p>集中攻克薄弱环节</p><span class="tag">复习 →</span>
        </div>
        <div class="card" onclick="App.go('plan')">
          <span class="badge">连续 ${streakDays} 天</span>
          <div class="icon">📅</div><h3>学习打卡</h3>
          <p>记录每日刷题，保持连续</p><span class="tag">查看 →</span>
        </div>
        <div class="card" onclick="App.go('print')">
          <span class="badge">可打印</span>
          <div class="icon">🖨️</div><h3>背诵清单</h3>
          <p>考点速记 + 全题库答案速览</p><span class="tag">查看 →</span>
        </div>
        <div class="card" onclick="App.go('sync')">
          <span class="badge">跨设备</span>
          <div class="icon">💾</div><h3>数据同步</h3>
          <p>导出/导入进度，手机电脑互通</p><span class="tag">使用 →</span>
        </div>
      </div>
      <div style="text-align:center;margin-top:22px">
        <button class="btn secondary" onclick="App.resetAll()">重置全部进度</button>
      </div>`;
  }

  function descOf(t) {
    return { single: '四选一，每题一个正确答案', multi: '多选，漏选/错选均不得分', judge: '判断对错', fill: '挖空记忆，点击显示答案', short: '背诵简答要点' }[t];
  }

  // ---------- practice (single/multi/judge) ----------
  function startPractice(type, shuffleOn = true) {
    const n = QB[type].length;
    const order = shuffleOn ? shuffle(seq(n)) : seq(n);
    const setups = {};
    QB[type].forEach((item, i) => setups[i] = setupOpts(type, item));
    state.prac = { type, order, idx: 0, answers: {}, setups, shuffle: shuffleOn };
    view = 'practice';
    render();
    window.scrollTo(0, 0);
  }

  function reshuffleOrder() {
    const p = state.prac;
    p.order = shuffle(seq(QB[p.type].length));
    p.idx = 0;
    render();
    window.scrollTo(0, 0);
  }
  function sequentialOrder() {
    const p = state.prac;
    p.order = seq(QB[p.type].length);
    p.idx = 0;
    render();
    window.scrollTo(0, 0);
  }

  function renderPractice() {
    const p = state.prac;
    const m = META[p.type];
    const realIdx = p.order[p.idx];
    const item = QB[p.type][realIdx];
    const setup = p.setups[realIdx];
    const rec = p.answers[realIdx];

    let optsHtml;
    if (p.type === 'judge') {
      optsHtml = setup.opts.map(o => {
        const sel = rec ? rec.sel === o.v : p.tmpSel === o.v;
        let cls = 'opt';
        if (rec) { if (o.v === setup.correct) cls += ' correct'; else if (sel) cls += ' wrong'; }
        else if (sel) cls += ' selected';
        return `<button class="${cls}" ${rec ? 'disabled' : ''} onclick="App.pickJudge(${o.v})">
          <span class="key">${o.emoji}</span><span>${o.label}</span></button>`;
      }).join('');
    } else {
      optsHtml = setup.opts.map(o => {
        let sel = false;
        if (p.type === 'multi') sel = rec ? rec.sel.includes(o.v) : p.tmpSel?.has(o.v);
        else sel = rec ? rec.sel === o.v : p.tmpSel === o.v;
        let cls = 'opt';
        if (rec) {
          const isAns = setup.correct.includes(o.v);
          if (isAns) cls += ' correct';
          else if (sel) cls += ' wrong';
        } else if (sel) cls += ' selected';
        return `<button class="${cls}" ${rec ? 'disabled' : ''} onclick="App.pick('${o.v}')">
          <span class="key">${o.v}</span><span>${esc(o.text)}</span></button>`;
      }).join('');
    }

    let feedback = '';
    if (rec) {
      const ok = rec.ok;
      feedback = `<div class="feedback ${ok ? 'ok' : 'bad'}">
        <b>${ok ? '✔ 回答正确' : '✘ 回答错误'}</b>
        正确答案：<b>${correctText(p.type, setup)}</b></div>`;
    }

    const progress = Math.round((p.idx / p.order.length) * 100);

    $().innerHTML = `
      <div class="section-head">
        <h2>${m.icon} ${m.name} · 练习模式</h2>
        <span class="hint">第 ${p.idx + 1} / ${p.order.length} 题</span>
      </div>
      <div class="actions" style="justify-content:flex-start;margin-bottom:14px">
        <button class="btn secondary" onclick="App.reshuffleOrder()">🔀 重新打乱</button>
        <button class="btn secondary" onclick="App.sequentialOrder()">↩ 按顺序</button>
        <span class="hint" style="margin-left:auto">选项顺序已随机</span>
      </div>
      <div class="pbar"><div style="width:${progress}%"></div></div>
      <div class="qbox">
        <div class="qmeta">
          <span class="chip">${m.name}</span>
          ${p.type === 'multi' ? '<span class="chip blue">多选题（多选）</span>' : ''}
        </div>
        <div class="qtext">${p.idx + 1}. ${esc(item.q)}</div>
        <div class="opts">${optsHtml}</div>
        ${feedback}
      </div>
      <div class="actions">
        <button class="btn secondary" ${p.idx === 0 ? 'disabled' : ''} onclick="App.nav(-1)">← 上一题</button>
        ${rec ? '' : `<button class="btn" onclick="App.submit()">提交答案</button>`}
        ${p.idx < p.order.length - 1 ? `<button class="btn outline" onclick="App.nav(1)">下一题 →</button>` : (rec ? `<button class="btn outline" onclick="App.finishPractice()">完成</button>` : '')}
      </div>
      <div class="actions">
        <button class="btn ghost" onclick="App.go('home')">返回首页</button>
      </div>`;
  }

  function pick(letter) {
    const p = state.prac;
    if (p.answers[p.order[p.idx]]) return;
    if (p.type === 'multi') {
      p.tmpSel = p.tmpSel || new Set();
      p.tmpSel.has(letter) ? p.tmpSel.delete(letter) : p.tmpSel.add(letter);
    } else {
      p.tmpSel = letter;
    }
    renderPractice();
  }
  function pickJudge(val) {
    const p = state.prac;
    if (p.answers[p.order[p.idx]]) return;
    p.tmpSel = val;
    renderPractice();
  }

  function submit() {
    const p = state.prac;
    const realIdx = p.order[p.idx];
    if (p.answers[realIdx]) return;
    const setup = p.setups[realIdx];
    let sel;
    if (p.type === 'multi') { sel = Array.from(p.tmpSel || []).sort().join(''); if (!sel) return; }
    else if (p.type === 'judge') { if (p.tmpSel === undefined) return; sel = p.tmpSel; }
    else { if (!p.tmpSel) return; sel = p.tmpSel; }
    const ok = gradeAnswer(p.type, setup, sel);
    p.answers[realIdx] = { sel, ok };
    record(idOf(p.type, realIdx), ok);
    bumpDaily(ok);
    p.tmpSel = undefined;
    renderPractice();
  }

  function nav(d) {
    const p = state.prac;
    p.idx = Math.max(0, Math.min(p.order.length - 1, p.idx + d));
    p.tmpSel = undefined;
    renderPractice();
    window.scrollTo(0, 0);
  }

  function finishPractice() {
    const p = state.prac;
    const done = Object.keys(p.answers).length;
    const ok = Object.values(p.answers).filter(r => r.ok).length;
    $().innerHTML = `
      <div class="result-card">
        <div class="score-ring">${done ? Math.round(ok / done * 100) : 0}%</div>
        <div class="meta">本轮练习 · 共答 ${done} 题 · 答对 ${ok} 题 · 答错 ${done - ok} 题</div>
        <div class="actions">
          <button class="btn" onclick="App.startPractice('${p.type}')">再练一轮（乱序）</button>
          <button class="btn outline" onclick="App.go('home')">返回首页</button>
        </div>
      </div>`;
    window.scrollTo(0, 0);
  }

  // ---------- memorize (fill / short) ----------
  function startMemorize(type) {
    const order = shuffle(seq(QB[type].length));
    state.mem = { type, order, shuffled: true, reveal: {} };
    view = 'memorize';
    render();
    window.scrollTo(0, 0);
  }

  function shuffleMem() { state.mem.order = shuffle(seq(QB[state.mem.type].length)); state.mem.shuffled = true; render(); window.scrollTo(0, 0); }
  function seqMem() { state.mem.order = seq(QB[state.mem.type].length); state.mem.shuffled = false; render(); window.scrollTo(0, 0); }

  function renderMemorize() {
    const m = META[state.mem.type];
    const type = state.mem.type;
    const order = state.mem.order;
    const list = QB[type];
    let body = '';

    if (type === 'fill') {
      body = order.map((realIdx, ci) => {
        const item = list[realIdx];
        const parts = item.q.split('____');
        let inner = '';
        parts.forEach((pt, pi) => {
          inner += esc(pt);
          if (pi < parts.length - 1) {
            const shown = state.mem.reveal[realIdx]?.[pi];
            inner += `<span class="blank${shown ? ' filled' : ''}" data-card="${realIdx}" data-k="${pi}">${shown ? esc(item.keys[pi]) : '· · ·'}</span>`;
          }
        });
        return `<div class="mem-card">
          <div class="qmeta"><span class="chip">填空 ${ci + 1}</span></div>
          <div class="qtext" style="font-weight:500">${inner}</div>
          <div class="actions" style="justify-content:flex-start;margin-top:14px">
            <button class="btn secondary" onclick="App.revealAllFill(${realIdx})">全部显示</button>
            <button class="btn ghost" onclick="App.hideFill(${realIdx})">隐藏</button>
          </div>
        </div>`;
      }).join('');
    } else {
      body = order.map((realIdx, ci) => {
        const item = list[realIdx];
        const shown = state.mem.reveal[realIdx]?.all;
        return `<div class="mem-card">
          <div class="qmeta"><span class="chip">简答 ${ci + 1}</span></div>
          <div class="qtext" style="font-weight:600">${esc(item.q)}</div>
          <div class="answer${shown ? ' show' : ''}">${esc(item.a).replace(/\n/g, '<br>')}</div>
          <div class="actions" style="justify-content:flex-start;margin-top:12px">
            <button class="btn secondary" onclick="App.toggleShort(${realIdx})">${shown ? '收起答案' : '显示答案'}</button>
          </div>
        </div>`;
      }).join('');
    }

    $().innerHTML = `
      <div class="section-head">
        <h2>${m.icon} ${m.name} · 背诵模式</h2>
        <span class="hint">共 ${list.length} 题 · 点击横线显示答案</span>
      </div>
      <div class="actions" style="justify-content:flex-start;margin-bottom:14px">
        <button class="btn secondary" onclick="App.shuffleMem()">🔀 乱序</button>
        <button class="btn secondary" onclick="App.seqMem()">↩ 顺序</button>
      </div>
      ${body}
      <div class="actions"><button class="btn ghost" onclick="App.go('home')">返回首页</button></div>`;
  }

  function revealBlank(realIdx, ki) { state.mem.reveal[realIdx] = state.mem.reveal[realIdx] || {}; state.mem.reveal[realIdx][ki] = true; renderMemorize(); }
  function revealAllFill(realIdx) { state.mem.reveal[realIdx] = state.mem.reveal[realIdx] || {}; QB.fill[realIdx].keys.forEach((_, ki) => state.mem.reveal[realIdx][ki] = true); renderMemorize(); }
  function hideFill(realIdx) { delete state.mem.reveal[realIdx]; renderMemorize(); }
  function toggleShort(realIdx) { state.mem.reveal[realIdx] = state.mem.reveal[realIdx] || {}; state.mem.reveal[realIdx].all = !state.mem.reveal[realIdx].all; renderMemorize(); }

  // ---------- exam ----------
  function examSetup() {
    $().innerHTML = `
      <div class="section-head"><h2>📝 模拟考试</h2></div>
      <div class="setup">
        <label>题型范围</label>
        <select id="examType">
          <option value="single">单选题</option>
          <option value="multi">多选题</option>
          <option value="judge">判断题</option>
          <option value="mixed">混合（单选+多选+判断）</option>
        </select>
        <label>题目数量</label>
        <input type="number" id="examCount" value="50" min="1" max="150">
        <label>考试时间（分钟，0 表示不限时）</label>
        <input type="number" id="examTime" value="0" min="0" max="180">
        <div class="actions" style="justify-content:flex-start;margin-top:20px">
          <button class="btn" onclick="App.examStart()">开始考试</button>
          <button class="btn secondary" onclick="App.go('home')">取消</button>
        </div>
      </div>`;
  }

  function examStart() {
    const type = document.getElementById('examType').value;
    let pool = [];
    const pick = (t) => QB[t].map((_, i) => ({ t, i }));
    if (type === 'mixed') pool = [...pick('single'), ...pick('multi'), ...pick('judge')];
    else pool = pick(type);

    let count = Math.min(+document.getElementById('examCount').value || pool.length, pool.length);
    const minutes = +document.getElementById('examTime').value || 0;
    const chosen = shuffle(pool).slice(0, count);
    const setups = chosen.map(cur => setupOpts(cur.t, QB[cur.t][cur.i]));

    state.exam = {
      items: chosen, setups, answers: {}, submitted: false, idx: 0,
      minutes, secondsLeft: minutes * 60, timer: null,
    };
    view = 'exam';
    render();
    if (minutes > 0) {
      state.exam.timer = setInterval(() => {
        if (state.exam.submitted) return;
        state.exam.secondsLeft--;
        if (state.exam.secondsLeft <= 0) { examSubmit(); return; }
        updateTimer();
      }, 1000);
    }
    window.scrollTo(0, 0);
  }

  function updateTimer() {
    const el = document.getElementById('timerBox');
    if (!el) return;
    const s = state.exam.secondsLeft;
    el.textContent = `⏱ ${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  function renderExam() {
    const e = state.exam;
    if (e.submitted) return renderExamResult();

    const cur = e.items[e.idx];
    const item = QB[cur.t][cur.i];
    const setup = e.setups[e.idx];
    const sel = e.answers[e.idx];

    let optsHtml;
    if (cur.t === 'judge') {
      optsHtml = setup.opts.map(o => {
        const isSel = sel === o.v;
        return `<button class="opt${isSel ? ' selected' : ''}" onclick="App.examPickJudge(${o.v})">
          <span class="key">${o.emoji}</span><span>${o.label}</span></button>`;
      }).join('');
    } else {
      optsHtml = setup.opts.map(o => {
        let isSel = cur.t === 'multi' ? (sel || '').includes(o.v) : sel === o.v;
        return `<button class="opt${isSel ? ' selected' : ''}" onclick="App.examPick('${o.v}')">
          <span class="key">${o.v}</span><span>${esc(o.text)}</span></button>`;
      }).join('');
    }

    const answeredCount = Object.keys(e.answers).length;
    const typeName = META[cur.t].name;

    let palette = e.items.map((_, i) => {
      const done = e.answers[i] !== undefined;
      return `<button class="btn ${done ? 'outline' : 'secondary'}" style="padding:6px 10px;font-size:12px" onclick="App.examGoto(${i})">${i + 1}</button>`;
    }).join('');

    $().innerHTML = `
      <div class="section-head">
        <h2>📝 模拟考试</h2>
        <span class="timer" id="timerBox">${e.minutes > 0 ? '⏱ ' + String(Math.floor(e.secondsLeft / 60)).padStart(2, '0') + ':' + String(e.secondsLeft % 60).padStart(2, '0') : '不限时'}</span>
      </div>
      <div class="pbar"><div style="width:${Math.round(e.idx / e.items.length * 100)}%"></div></div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">${palette}</div>
      <div class="qbox">
        <div class="qmeta">
          <span class="chip">${typeName}</span>
          <span class="chip blue">第 ${e.idx + 1} / ${e.items.length} 题</span>
          ${cur.t === 'multi' ? '<span class="chip blue">多选</span>' : ''}
        </div>
        <div class="qtext">${e.idx + 1}. ${esc(item.q)}</div>
        <div class="opts">${optsHtml}</div>
      </div>
      <div class="actions">
        <button class="btn secondary" ${e.idx === 0 ? 'disabled' : ''} onclick="App.examNav(-1)">← 上一题</button>
        <button class="btn outline" onclick="App.examSubmit()">交卷（已答 ${answeredCount} 题）</button>
        ${e.idx < e.items.length - 1 ? `<button class="btn" onclick="App.examNav(1)">下一题 →</button>` : ''}
      </div>`;
  }

  function examPick(letter) {
    const e = state.exam;
    const cur = e.items[e.idx];
    if (cur.t === 'multi') {
      const s = new Set(e.answers[e.idx] || '');
      s.has(letter) ? s.delete(letter) : s.add(letter);
      e.answers[e.idx] = Array.from(s).sort().join('');
    } else {
      e.answers[e.idx] = letter;
    }
    renderExam();
  }
  function examPickJudge(val) { state.exam.answers[state.exam.idx] = val; renderExam(); }
  function examNav(d) { state.exam.idx = Math.max(0, Math.min(state.exam.items.length - 1, state.exam.idx + d)); renderExam(); window.scrollTo(0, 0); }
  function examGoto(i) { state.exam.idx = i; renderExam(); window.scrollTo(0, 0); }

  function examSubmit() {
    const e = state.exam;
    if (e.submitted) return;
    e.submitted = true;
    if (e.timer) clearInterval(e.timer);
    renderExamResult();
    window.scrollTo(0, 0);
  }

  function renderExamResult() {
    const e = state.exam;
    const total = e.items.length;
    let ok = 0;
    const detail = e.items.map((cur, idx) => {
      const item = QB[cur.t][cur.i];
      const setup = e.setups[idx];
      const sel = e.answers[idx];
      const isOk = gradeAnswer(cur.t, setup, sel);
      if (isOk) ok++;
      record(idOf(cur.t, cur.i), isOk);
      if (sel !== undefined) bumpDaily(isOk);

      let yourText;
      if (cur.t === 'judge') yourText = sel === undefined ? '未作答' : (sel ? '对' : '错');
      else if (cur.t === 'multi') yourText = sel ? sortStr(sel).split('').join('') : '未作答';
      else yourText = sel || '未作答';

      return `<div class="review-item">
        <div class="qmeta"><span class="chip">${META[cur.t].name}</span><span class="stamp ${isOk ? 'ok' : 'bad'}">${isOk ? '✓ 正确' : '✘ 错误'}</span></div>
        <div class="rq">${esc(item.q)}</div>
        <div class="ro">你的答案：<span class="${isOk ? 'y' : 'n'}">${esc(yourText)}</span>　正确答案：<span class="y">${esc(correctText(cur.t, setup))}</span></div>
      </div>`;
    }).join('');

    const pct = total ? Math.round(ok / total * 100) : 0;
    const pass = pct >= 60;

    $().innerHTML = `
      <div class="result-card">
        <div class="score-ring" style="color:${pass ? 'var(--ok)' : 'var(--bad)'}">${pct}</div>
        <div class="meta">答对 ${ok} / ${total} 题 · ${pass ? '🎉 及格（60分以上）' : '继续加油！'}</div>
        <div class="actions">
          <button class="btn" onclick="App.examSetup()">再考一次</button>
          <button class="btn outline" onclick="App.go('home')">返回首页</button>
        </div>
      </div>
      <div style="margin-top:20px"><h3 style="margin-bottom:12px">📋 答题回顾</h3>${detail}</div>`;
  }

  // ---------- wrong book ----------
  function renderWrong() {
    const ids = Object.keys(wrong);
    if (ids.length === 0) {
      $().innerHTML = `<div class="empty"><div class="big">🎉</div><p>暂无错题，继续保持！</p><div class="actions"><button class="btn" onclick="App.go('home')">返回首页</button></div></div>`;
      return;
    }
    const items = ids.map((id, n) => {
      const { type, idx } = parseId(id);
      const item = QB[type]?.[idx];
      if (!item) return null;
      let ansText;
      if (type === 'judge') ansText = item.a ? '对（正确）' : '错（错误）';
      else if (type === 'multi') ansText = sortStr(item.a).split('').join('');
      else if (type === 'fill') ansText = item.keys.join('、');
      else if (type === 'short') ansText = '见背诵模式';
      else ansText = item.a;
      return `<div class="witem">
        <div class="qmeta"><span class="chip">${META[type].name}</span><span class="chip blue">#${n + 1}</span></div>
        <div class="qtext" style="font-size:15px">${esc(item.q)}</div>
        <div class="ans">正确答案：<b>${esc(ansText)}</b></div>
        <div class="actions" style="justify-content:flex-start;margin-top:12px">
          <button class="btn" onclick="App.redo('${id}')">重做此题</button>
          <button class="btn secondary" onclick="App.clearWrong('${id}')">已掌握，移除</button>
        </div>
      </div>`;
    }).filter(Boolean).join('');

    $().innerHTML = `
      <div class="section-head"><h2>📌 错题本</h2><span class="hint">共 ${ids.length} 题</span></div>
      ${items}
      <div class="actions">
        <button class="btn secondary" onclick="App.clearAllWrong()">清空错题本</button>
        <button class="btn ghost" onclick="App.go('home')">返回首页</button>
      </div>`;
  }

  function redo(id) {
    const { type, idx } = parseId(id);
    if (type === 'single' || type === 'multi' || type === 'judge') {
      state.prac = { type, order: [idx], idx: 0, answers: {}, setups: { [idx]: setupOpts(type, QB[type][idx]) }, shuffle: false };
      view = 'practice'; render();
    } else {
      state.mem = { type, order: [idx], shuffled: false, reveal: {} };
      view = 'memorize'; render();
    }
    window.scrollTo(0, 0);
  }

  function clearWrong(id) { delete wrong[id]; save(LS_WRONG, wrong); if (view === 'wrong') render(); }
  function clearAllWrong() { wrong = {}; save(LS_WRONG, wrong); if (view === 'wrong') render(); }

  function resetAll() {
    if (!confirm('确定要清空全部做题记录和错题本吗？')) return;
    localStorage.removeItem(LS_STATS);
    localStorage.removeItem(LS_WRONG);
    localStorage.removeItem(LS_DAILY);
    Object.keys(stats).forEach(k => delete stats[k]);
    Object.keys(daily).forEach(k => delete daily[k]);
    wrong = {};
    render();
  }

  // ---------- 学习打卡 / 学习计划 ----------
  function renderPlan() {
    const streak = calcStreak();
    const totalDays = Object.keys(daily).filter(k => daily[k] && daily[k].a > 0).length;
    const tk = todayKey();
    const todayA = daily[tk]?.a || 0;
    const todayC = daily[tk]?.c || 0;

    let cells = '';
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const a = daily[dateKey(d)]?.a || 0;
      let cls = 'cal-day empty';
      if (a >= goal) cls = 'cal-day full';
      else if (a > 0) cls = 'cal-day partial';
      cells += `<div class="cal"><div class="${cls}">${d.getDate()}</div><div class="cal-n">${a}</div></div>`;
    }

    $().innerHTML = `
      <div class="section-head"><h2>📅 学习打卡</h2></div>
      <div class="hero">
        <div class="stats">
          <div class="stat"><b>${streak}</b><span>连续打卡(天)</span></div>
          <div class="stat"><b>${totalDays}</b><span>累计打卡(天)</span></div>
          <div class="stat"><b>${todayA}</b><span>今日已刷题</span></div>
          <div class="stat"><b>${todayA ? Math.round(todayC / todayA * 100) : 0}%</b><span>今日正确率</span></div>
        </div>
        <div style="margin-top:16px">
          <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--muted);margin-bottom:6px">
            <span>今日目标</span><span>${todayA} / ${goal} 题</span>
          </div>
          <div class="pbar"><div style="width:${Math.min(100, Math.round(todayA / goal * 100))}%"></div></div>
        </div>
        <div class="actions" style="justify-content:flex-start;margin-top:16px">
          <input type="number" id="goalInput" value="${goal}" min="5" max="500" style="width:120px;padding:10px;border:1.5px solid var(--line);border-radius:10px;font-size:15px">
          <button class="btn secondary" onclick="App.setGoal()">设置每日目标</button>
        </div>
      </div>
      <div class="setup" style="margin-top:16px">
        <h3 style="margin-bottom:12px">最近 14 天</h3>
        <div class="cal-row">${cells}</div>
        <div class="cal-legend">
          <span><i class="dot full"></i>达成目标</span>
          <span><i class="dot partial"></i>已刷题</span>
          <span><i class="dot empty"></i>未打卡</span>
        </div>
      </div>
      <div class="actions"><button class="btn ghost" onclick="App.go('home')">返回首页</button></div>`;
  }

  function setGoal() {
    const v = +document.getElementById('goalInput').value;
    if (v > 0) { goal = v; save(LS_GOAL, goal); renderPlan(); }
  }

  // ---------- 背诵清单（打印） ----------
  function renderPrint() {
    let content = '';

    content += `<h2 class="p-sec">核心考点速记（高频知识点）</h2>`;
    QB.speed.forEach(g => {
      content += `<h3 class="p-sub">${esc(g.cat)}</h3>`;
      content += `<div class="print-item"><div class="p-a">${g.facts.map(f => '• ' + esc(f)).join('<br>')}</div></div>`;
    });

    content += `<h2 class="p-sec">单选题答案速览（共 ${QB.single.length} 题）</h2>`;
    QB.single.forEach((it, i) => {
      const text = it.o[it.a.charCodeAt(0) - 65];
      content += `<div class="print-item"><div class="p-q">${i + 1}. ${esc(it.q)}</div><div class="p-a"><span class="p-ans">答：${it.a}</span>　${esc(text)}</div></div>`;
    });

    content += `<h2 class="p-sec">多选题答案速览（共 ${QB.multi.length} 题）</h2>`;
    QB.multi.forEach((it, i) => {
      const ans = sortStr(it.a);
      const texts = ans.split('').map(c => it.o[c.charCodeAt(0) - 65]).join('；');
      content += `<div class="print-item"><div class="p-q">${i + 1}. ${esc(it.q)}</div><div class="p-a"><span class="p-ans">答：${ans.split('').join('')}</span>　${esc(texts)}</div></div>`;
    });

    content += `<h2 class="p-sec">判断题（共 ${QB.judge.length} 题）</h2>`;
    QB.judge.forEach((it, i) => {
      content += `<div class="print-item"><div class="p-q">${i + 1}. ${esc(it.q)}　<span class="p-ans">（${it.a ? '对' : '错'}）</span></div></div>`;
    });

    content += `<h2 class="p-sec">填空题·答案版（共 ${QB.fill.length} 题）</h2>`;
    QB.fill.forEach((it, i) => {
      let full = it.q;
      it.keys.forEach(k => full = full.replace('____', k));
      content += `<div class="print-item"><div class="p-q">${i + 1}. ${esc(full)}</div></div>`;
    });

    content += `<h2 class="p-sec">简答题（共 ${QB.short.length} 题）</h2>`;
    QB.short.forEach((it, i) => {
      content += `<div class="print-item"><div class="p-q">${i + 1}. ${esc(it.q)}</div><div class="p-a">${esc(it.a).replace(/\n/g, '<br>')}</div></div>`;
    });

    $().innerHTML = `
      <div class="section-head no-print">
        <h2>🖨️ 背诵清单</h2>
        <span class="hint">核心考点速记 + 单选/多选答案 + 判断/填空/简答，可打印 / 存为 PDF / 复制文本</span>
      </div>
      <div class="actions no-print" style="justify-content:flex-start;margin-bottom:16px">
        <button class="btn" onclick="window.print()">🖨️ 打印 / 存为 PDF</button>
        <button class="btn secondary" onclick="App.copyPrint()">📋 复制为纯文本</button>
        <button class="btn ghost" onclick="App.go('home')">返回首页</button>
      </div>
      <div id="printRoot">${content}</div>`;
  }

  function copyPrint() {
    let txt = '入团积极分子考试 · 背诵清单\n\n';
    txt += '【核心考点速记】\n';
    QB.speed.forEach(g => { txt += `\n◆ ${g.cat}\n`; g.facts.forEach(f => txt += `• ${f}\n`); });
    txt += '\n【单选题答案速览】\n';
    QB.single.forEach((it, i) => txt += `${i + 1}. ${it.q}\n   答：${it.a}　${it.o[it.a.charCodeAt(0) - 65]}\n`);
    txt += '\n【多选题答案速览】\n';
    QB.multi.forEach((it, i) => { const ans = sortStr(it.a); const texts = ans.split('').map(c => it.o[c.charCodeAt(0) - 65]).join('；'); txt += `${i + 1}. ${it.q}\n   答：${ans.split('').join('')}　${texts}\n`; });
    txt += '\n【判断题】\n';
    QB.judge.forEach((it, i) => txt += `${i + 1}. ${it.q}（${it.a ? '对' : '错'}）\n`);
    txt += '\n【填空题·答案版】\n';
    QB.fill.forEach((it, i) => { let full = it.q; it.keys.forEach(k => full = full.replace('____', k)); txt += `${i + 1}. ${full}\n`; });
    txt += '\n【简答题】\n';
    QB.short.forEach((it, i) => txt += `${i + 1}. ${it.q}\n答：${it.a.replace(/\n/g, '\n   ')}\n\n`);
    copyText(txt);
  }

  function copyText(s) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(s).then(() => alert('已复制到剪贴板'), () => fallbackCopy(s));
    } else fallbackCopy(s);
  }
  function fallbackCopy(s) {
    const ta = document.createElement('textarea');
    ta.value = s; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); alert('已复制到剪贴板'); } catch { prompt('复制失败，请手动复制：', s); }
    document.body.removeChild(ta);
  }

  // ---------- 数据同步（跨设备手动） ----------
  function renderSync() {
    $().innerHTML = `
      <div class="section-head"><h2>💾 数据同步</h2></div>
      <div class="setup">
        <p style="font-size:14px;color:var(--muted);margin-bottom:14px;line-height:1.7">
          把做题进度、错题本、打卡记录、目标导出一段「同步代码」，在另一台设备（手机/电脑）上粘贴导入，即可同步进度。<br>
          说明：这是手动同步，无云端账号；如需全自动云同步（免复制），需要额外接入后端。
        </p>
        <label>① 导出本机数据</label>
        <textarea id="syncOut" rows="5" style="width:100%;padding:12px;border:1.5px solid var(--line);border-radius:10px;font-size:12px;font-family:monospace" readonly placeholder="点击下方按钮生成同步代码"></textarea>
        <div class="actions" style="justify-content:flex-start;margin-top:10px">
          <button class="btn" onclick="App.exportData()">生成并复制代码</button>
        </div>
        <label style="margin-top:20px">② 导入到本机</label>
        <textarea id="syncIn" rows="5" style="width:100%;padding:12px;border:1.5px solid var(--line);border-radius:10px;font-size:12px;font-family:monospace" placeholder="把另一台设备生成的代码粘贴到这里"></textarea>
        <div class="actions" style="justify-content:flex-start;margin-top:10px">
          <button class="btn secondary" onclick="App.importData()">导入并覆盖本机进度</button>
        </div>
      </div>
      <div class="actions"><button class="btn ghost" onclick="App.go('home')">返回首页</button></div>`;
  }

  function exportData() {
    const payload = { stats, wrong, daily, goal, v: 1 };
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    const ta = document.getElementById('syncOut');
    if (ta) ta.value = b64;
    copyText(b64);
  }

  function importData() {
    const b64 = document.getElementById('syncIn').value.trim();
    if (!b64) { alert('请先粘贴同步代码'); return; }
    try {
      const json = decodeURIComponent(escape(atob(b64)));
      const p = JSON.parse(json);
      if (!p || typeof p !== 'object') throw new Error('bad');
      Object.keys(stats).forEach(k => delete stats[k]);
      Object.assign(stats, p.stats || {});
      wrong = p.wrong || {};
      Object.keys(daily).forEach(k => delete daily[k]);
      Object.assign(daily, p.daily || {});
      goal = +p.goal > 0 ? +p.goal : 50;
      save(LS_STATS, stats); save(LS_WRONG, wrong); save(LS_DAILY, daily); save(LS_GOAL, goal);
      alert('导入成功！进度已同步到本机。');
      go('home');
    } catch { alert('代码无效，请检查后重试'); }
  }

  // ---------- open (from home cards) ----------
  function open(type) {
    if (type === 'single' || type === 'multi' || type === 'judge') return startPractice(type);
    return startMemorize(type);
  }

  // ---------- event delegation for blanks ----------
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.blank');
    if (b && view === 'memorize') revealBlank(+b.dataset.card, +b.dataset.k);
  });

  document.addEventListener('keydown', (e) => {
    if (view === 'practice' && state.prac) {
      const p = state.prac;
      const realIdx = p.order[p.idx];
      const setup = p.setups[realIdx];
      const n = setup.opts.length;
      if (e.key >= '1' && e.key <= String(n)) {
        if (p.type === 'judge') pickJudge(e.key === '1');
        else pick(setup.opts[+e.key - 1].v);
      } else if (e.key === 'Enter') { submit(); }
      else if (e.key === 'ArrowLeft') { nav(-1); }
      else if (e.key === 'ArrowRight') { nav(1); }
    }
  });

  // ---------- init ----------
  render();

  return {
    go, open, startPractice, startMemorize, reshuffleOrder, sequentialOrder, shuffleMem, seqMem,
    pick, pickJudge, submit, nav, finishPractice,
    revealBlank, revealAllFill, hideFill, toggleShort,
    examSetup, examStart, examPick, examPickJudge, examNav, examGoto, examSubmit,
    redo, clearWrong, clearAllWrong, resetAll, setGoal, copyPrint, exportData, importData,
  };
})();
