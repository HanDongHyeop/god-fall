/* 시험용 디버그 패널. 출시 전에 지운다: index.html의 script 태그, 이 파일, style.css의 디버그 블록.
   게임 규칙은 건드리지 않고 Meta·game 값만 바꾼다. 무적은 이 기기에 기억한다. */
'use strict';
(() => {
  const KEY = 'gf_debug', stage = document.getElementById('stage');
  let god = false, again = 0;
  try { god = !!JSON.parse(localStorage.getItem(KEY) || '{}').god; } catch (e) {}
  const setGod = v => { god = v; game.god = v; try { localStorage.setItem(KEY, JSON.stringify({ god: v })); } catch (e) {} btn.classList.toggle('god', v); btn.textContent = v ? '무적 ON' : '디버그'; };

  const btn = document.createElement('button'); btn.id = 'dbgBtn'; btn.setAttribute('aria-label', '디버그');
  const panel = document.createElement('div'); panel.id = 'dbg';
  stage.append(btn, panel);

  let resume = null;
  const open = () => {
    if (game.state === 'play') { resume = 'play'; game.state = 'pause'; input.clearAll(); }
    panel.classList.add('on'); again = 0; draw();
  };
  const close = () => {
    panel.classList.remove('on');
    if (resume && game.state === 'pause') { game.state = resume; input.blockUntil = performance.now() + 120; }
    resume = null;
    if (document.getElementById('lobby').classList.contains('on')) UI.render();
  };
  const inRun = () => !!game.p && ['play', 'descend', 'pause', 'intro', 'bossdead'].includes(game.state);
  const say = t => UI.toast(t);
  /* 맵 바로 시작. 에너지를 쓰지 않는다 */
  const startAt = (chapter, wave) => {
    Meta.s.chapter = chapter; UI.chapterView = chapter; Meta.save();
    for (const id of ['mResult', 'mPause', 'mCont', 'mCard']) { const el = document.getElementById(id); if (el) el.classList.remove('on'); }
    resume = null; panel.classList.remove('on'); sfx.init(); startRun({ chapter, wave });
  };
  /* 함정 문(중간 보스) 바로 들어가기 */
  const startMiniAt = chapter => {
    startAt(chapter, 1 + chapter * STAGES); game.state = 'play'; game.cine = 0; document.getElementById('pause').style.visibility = '';
    enterRoom({ x: TILE, y: game.p.y, side: 0, kind: 'mini', fake: 'shop', used: false });
  };
  const lockGod = id => {
    const s = Meta.s, others = GODS.filter(g => g.id !== id && Meta.godLv(g.id));
    if (!others.length) { say('한 명은 해금되어 있어야 합니다'); return; }
    if (s.god === id) Meta.selectGod(others[0].id);
    s.gods[id] = { own: false, level: 1, shard: (s.gods[id] || {}).shard || 0 };
    if (UI.godView === id) UI.godView = s.god;
  };

  const b = (act, text, cls = '', dis = false) => `<button data-a="${act}" class="${cls}" ${dis ? 'disabled' : ''}>${text}</button>`;
  function draw() {
    const s = Meta.s, g = game;
    const where = inRun() ? `지금 판: 챕터 ${sectorOf(g.wave)} ${g.biome.name} · ${stageOf(g.wave)}/${STAGES}판${g.isBossWave ? ' (보스)' : isRestWave(g.wave) ? ' (휴식)' : ''} · 통산 ${g.wave} · 난이도 단계 ${(g.lv || 0).toFixed(1)}${g.minis ? ' · 중간 보스' : ''} · 문 ${g.room ? '안' : (g.doors || []).map(d => ROOM_LABEL[d.kind] || '중간 보스').join(', ') || '없음'} · 상태 ${resume || g.state}` : '판 밖(로비)';
    const gods = GODS.map(G => {
      const l = Meta.godLv(G.id), i = Meta.godInfo(G.id);
      return `<div class="dr"><span>${G.name} (${G.rank}) · ${l ? 'Lv.' + l : '잠김'} · 조각 ${i.shard}${s.god === G.id ? ' · 출전 중' : ''}</span>${l ? b('lock:' + G.id, '잠금', 'no') : b('unlock:' + G.id, '해금', 'on')}${b('lv-:' + G.id, 'Lv -', '', l <= 1)}${b('lv+:' + G.id, 'Lv +', '', !l || l >= GOD_LV_MAX)}${b('sel:' + G.id, '출전', s.god === G.id ? 'on' : '', !l)}${b('sh+:' + G.id, '조각 +50')}${b('sh0:' + G.id, '조각 0')}</div><div class="dr"><span>${G.weapon}: ${(() => { const w = Meta.item(Meta.weaponOf(G.id)); return w ? GRADES[w.g].name + ' Lv.' + Meta.weaponLvOf(G.id) : '없음'; })()}</span>${b('wg-:' + G.id, '무기 등급 -', '', !l)}${b('wg+:' + G.id, '무기 등급 +', '', !l)}${b(`wl:${G.id}:-10`, 'Lv -10', '', !l)}${b(`wl:${G.id}:10`, 'Lv +10', '', !l)}${b(`giveW:${G.id}:1`, '가방에 희귀')}</div>`;
    }).join('');
    const slots = SLOTS.map(S => `<div class="dr"><span>${S.name} Lv.${s.slotLv[S.id]} · 스크롤 ${s.scrolls[S.id]}</span>${b(`sl:${S.id}:-10`, '-10')}${b(`sl:${S.id}:-1`, '-1')}${b(`sl:${S.id}:1`, '+1')}${b(`sl:${S.id}:10`, '+10')}${b(`sl:${S.id}:0`, 'Lv.1로')}</div>`).join('');
    panel.innerHTML = `<div class="dh"><span>디버그</span><button data-a="close" aria-label="닫기">✕</button></div><div class="db">
      <div class="now">${where}<br>골드 ${s.gold} · 보석 ${s.gem} · 에너지 ${s.energy}</div>
      <div class="now">모든 신 보너스: 공격력 +${(Meta.accountBonus().atk * 100).toFixed(1)}% · 체력 +${(Meta.accountBonus().hp * 100).toFixed(1)}%</div>
      <h5>전투</h5><div class="dr">${b('god', god ? '무적 켜짐 (피 안 닳음)' : '무적 꺼짐', god ? 'on' : 'no')}${b('next', '다음 판', '', !inRun())}${b('kill', '죽기 (이어하기 시험)', '', !inRun())}</div>
      <h5>맵 바로 시작 (에너지 안 씀)</h5>
      ${Array.from({ length: CHAPTERS }, (_, c) => `<div class="dr"><span>챕터 ${c + 1} · ${chapterInfo(c).name}</span>${b(`go:${c}:${1 + c * STAGES}`, '1판')}${b(`go:${c}:${3 + c * STAGES}`, '휴식')}${b(`go:${c}:${5 + c * STAGES}`, '5판')}${b(`go:${c}:${6 + c * STAGES}`, '보스')}${b(`mini:${c}`, '중간 보스')}</div>`).join('')}
      <div class="dr">${b('chOpen', '챕터 전부 열기')}${b('chLock', '챕터 잠그기')}</div>
      <h5>재화</h5><div class="dr">${b('gold+', '골드 +10만')}${b('gem+', '보석 +1만')}${b('en', '에너지 채우기')}${b('sc+', '스크롤 전부 +100')}${b('cur0', '재화 전부 0', 'no')}</div>
      <h5>캐릭터</h5>${gods}
      <h5>장비 레벨 (칸마다)</h5>${slots}<div class="dr">${b('slAll', '전부 Lv.1로', 'no')}</div>
      <h5>장비 지급</h5><div class="dr">${GRADES.map((G, i) => b('give:' + i, G.name + ' 6칸')).join('')}</div>
      <h5>초기화</h5><div class="dr">${b('wipe', again ? '한 번 더 누르면 지웁니다' : '저장 전체 초기화', 'no')}</div></div>`;
  }
  function act(a) {
    const s = Meta.s, [k, x, y] = a.split(':');
    if (k === 'close') { close(); return; }
    if (k === 'go') { startAt(+x, +y); return; }
    if (k === 'mini') { startMiniAt(+x); return; }
    if (k === 'god') setGod(!god);
    else if (k === 'next') { if (game.isBossWave && game.boss) game.boss = null; game.room = null; game.saved = null; game.minis = null; document.getElementById('mPause').classList.remove('on'); resume = null; panel.classList.remove('on'); nextWave(); return; }
    else if (k === 'kill') { setGod(false); panel.classList.remove('on'); resume = null; game.state = 'play'; game.hitStop = 0; game.p.hp = 0; gameOver(); return; }
    else if (k === 'chOpen') s.cleared = BIOMES.map(() => true);
    else if (k === 'chLock') { s.cleared = BIOMES.map(() => false); s.chapter = 0; UI.chapterView = 0; }
    else if (k === 'gold+') s.gold += 100000;
    else if (k === 'gem+') s.gem += 10000;
    else if (k === 'en') { s.energy = 30; s.energyAt = Date.now(); }
    else if (k === 'sc+') SLOTS.forEach(S => { s.scrolls[S.id] += 100; });
    else if (k === 'cur0') { s.gold = 0; s.gem = 0; s.energy = 0; s.energyAt = Date.now(); SLOTS.forEach(S => { s.scrolls[S.id] = 0; }); }
    else if (k === 'unlock') { const i = s.gods[x] = s.gods[x] || { own: false, level: 1, shard: 0 }; i.own = true; i.level = 1; Meta.grantWeapon(x); }
    else if (k === 'wg+' || k === 'wg-') { Meta.grantWeapon(x); const w = Meta.item(Meta.weaponOf(x)); if (w) w.g = clamp(w.g + (k === 'wg+' ? 1 : -1), 0, 3); }
    else if (k === 'wl') { const l = clamp(Meta.weaponLvOf(x) + +y, 1, LV_MAX); s.weaponLv[x] = l; if (x === s.god) s.slotLv.weapon = l; }
    else if (k === 'giveW') { const it = Meta.addItem('weapon_a', +y, x); it.isNew = true; }
    else if (k === 'lock') lockGod(x);
    else if (k === 'lv+') s.gods[x].level = Math.min(GOD_LV_MAX, Meta.godLv(x) + 1);
    else if (k === 'lv-') s.gods[x].level = Math.max(1, Meta.godLv(x) - 1);
    else if (k === 'sel') Meta.selectGod(x);
    else if (k === 'sh+') Meta.addShard(x, 50);
    else if (k === 'sh0') { if (s.gods[x]) s.gods[x].shard = 0; }
    else if (k === 'sl') { s.slotLv[x] = +y === 0 ? 1 : clamp(s.slotLv[x] + +y, 1, LV_MAX); if (x === 'weapon') s.weaponLv[s.god] = s.slotLv.weapon; }
    else if (k === 'slAll') { SLOTS.forEach(S => { s.slotLv[S.id] = 1; }); s.weaponLv[s.god] = 1; }
    else if (k === 'give') { const key = {}; for (const d of Object.keys(GEAR)) { const sl = GEAR[d].slot; if (!key[sl]) { key[sl] = 1; Meta.equip(Meta.addItem(d, +x).uid); } } }
    else if (k === 'wipe') { if (!again) { again = 1; draw(); return; } if (inRun()) { resume = null; UI.backToLobby(); } Meta.reset(); UI.godView = null; UI.chapterView = 0; say('저장을 지웠습니다'); }
    again = 0; Meta.save(); draw();
    if (document.getElementById('lobby').classList.contains('on')) UI.render();
  }
  btn.onclick = () => { sfx.tap(); open(); };
  panel.onclick = e => { const t = e.target.closest('[data-a]'); if (t && !t.disabled) { sfx.tap(); act(t.dataset.a); } };
  setGod(god);
  window.GF.debug = { open, close, act, setGod };
})();
