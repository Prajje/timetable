export function buildPlanDrawer({ skeleton, targetDate, onSave, onCancel }) {
  return (root) => {
    root.style.maxHeight = '90vh';
    const h = document.createElement('h2');
    h.textContent = `Plan for ${targetDate}`;
    h.style.cssText = 'font-family:var(--font-display); margin:0 0 16px;';
    root.appendChild(h);

    const blocksContainer = document.createElement('div');
    root.appendChild(blocksContainer);

    const state = { blocks: skeleton.length > 0 ? structuredClone(skeleton) : [defaultBlock(1)] };

    function rerender() {
      blocksContainer.innerHTML = '';
      state.blocks.forEach((b, idx) => blocksContainer.appendChild(renderBlock(b, idx, state, rerender)));
    }
    rerender();

    const addBlockBtn = document.createElement('button');
    addBlockBtn.textContent = '+ Add block';
    addBlockBtn.style.cssText = 'margin-top:12px; background:transparent; color:var(--accent); border:1px dashed var(--accent); padding:10px; border-radius:8px; width:100%;';
    addBlockBtn.addEventListener('click', () => {
      if (state.blocks.length >= 5) return;
      state.blocks.push(defaultBlock(state.blocks.length + 1));
      rerender();
    });
    root.appendChild(addBlockBtn);

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex; gap:10px; margin-top:18px;';
    const cancel = document.createElement('button');
    cancel.textContent = 'Cancel';
    cancel.style.cssText = 'flex:1; background:transparent; color:var(--text); border:1px solid var(--surface-2); padding:12px; border-radius:8px;';
    cancel.addEventListener('click', onCancel);
    const save = document.createElement('button');
    save.textContent = 'Save plan';
    save.style.cssText = 'flex:2; background:var(--accent); color:var(--bg); border:none; padding:12px; border-radius:8px; font-weight:600;';
    save.addEventListener('click', () => onSave(blocksToTasks(state.blocks, targetDate)));
    actions.append(cancel, save);
    root.appendChild(actions);
  };
}

function defaultBlock(idx) {
  const titles = ['Morning', 'Afternoon', 'Evening', 'Late night', 'Block 5'];
  return {
    blockIndex: idx,
    blockTitle: titles[idx - 1] ?? `Block ${idx}`,
    powerUp:  { id: null, title: 'Power Up', description: '1. Eat\n2. Call\n3. Text', time: '' },
    yolo:     { id: null, title: 'Yolo task', minMins: 30, time: '' },
    regulars: [],
    boss:     { id: null, title: '', minMins: 45, time: '' }
  };
}

function renderBlock(b, idx, state, rerender) {
  const card = document.createElement('div');
  card.style.cssText = 'background:var(--surface-2); padding:14px; border-radius:10px; margin-bottom:12px;';

  const titleRow = document.createElement('div');
  titleRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;';
  const t = document.createElement('input');
  t.value = b.blockTitle;
  t.style.cssText = 'background:transparent; border:none; color:var(--text); font-family:var(--font-display); font-size:18px; font-weight:700; flex:1;';
  t.addEventListener('input', () => { b.blockTitle = t.value; });
  titleRow.appendChild(t);
  if (state.blocks.length > 1) {
    const rm = document.createElement('button');
    rm.textContent = '×';
    rm.style.cssText = 'background:transparent; color:var(--text-dim); border:none; font-size:20px;';
    rm.addEventListener('click', () => { state.blocks.splice(idx, 1); rerender(); });
    titleRow.appendChild(rm);
  }
  card.appendChild(titleRow);

  card.appendChild(makeRow([
    ['Power Up title', b.powerUp.title, v => b.powerUp.title = v, 3, 'text'],
    ['Time', b.powerUp.time, v => b.powerUp.time = v, 1, 'time']
  ]));
  card.appendChild(makeTextarea('Power Up sub-items', b.powerUp.description, v => b.powerUp.description = v));

  card.appendChild(makeRow([
    ['Yolo title', b.yolo.title, v => b.yolo.title = v, 3, 'text'],
    ['Time', b.yolo.time, v => b.yolo.time = v, 1, 'time'],
    ['Min', b.yolo.minMins ?? '', v => b.yolo.minMins = Number(v) || null, 1, 'number']
  ]));

  const regHeader = document.createElement('div');
  regHeader.textContent = 'Other tasks';
  regHeader.style.cssText = 'font-size:13px; color:var(--text-dim); margin:10px 0 4px;';
  card.appendChild(regHeader);
  b.regulars.forEach((r, ri) => {
    card.appendChild(makeRowWithRemove([
      ['Title', r.title, v => r.title = v, 3, 'text'],
      ['Time', r.time ?? '', v => r.time = v, 1, 'time'],
      ['Min', r.minMins ?? '', v => r.minMins = Number(v) || null, 1, 'number']
    ], () => { b.regulars.splice(ri, 1); rerender(); }));
  });
  const addReg = document.createElement('button');
  addReg.textContent = '+ Add task';
  addReg.style.cssText = 'background:transparent; color:var(--text-dim); border:1px dashed var(--surface); padding:6px; border-radius:6px; width:100%; font-size:13px; margin-top:4px;';
  addReg.addEventListener('click', () => { b.regulars.push({ id: null, title: '', minMins: 45, time: '' }); rerender(); });
  card.appendChild(addReg);

  card.appendChild(makeRow([
    ['⚔ Boss title', b.boss.title, v => b.boss.title = v, 3, 'text'],
    ['Time', b.boss.time, v => b.boss.time = v, 1, 'time'],
    ['Min', b.boss.minMins ?? '', v => b.boss.minMins = Number(v) || null, 1, 'number']
  ]));

  return card;
}

function makeRow(fields) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; gap:8px; margin:6px 0; align-items:flex-end;';
  for (const [label, value, onChange, flex, type] of fields) {
    const w = makeFieldOfType(label, value, onChange, type);
    w.style.flex = String(flex);
    wrap.appendChild(w);
  }
  return wrap;
}

function makeRowWithRemove(fields, onRemove) {
  const wrap = makeRow(fields);
  const rm = document.createElement('button');
  rm.textContent = '×';
  rm.style.cssText = 'background:transparent; color:var(--text-dim); border:none; font-size:20px; padding:0 6px;';
  rm.addEventListener('click', onRemove);
  wrap.appendChild(rm);
  return wrap;
}

function makeFieldOfType(label, value, onChange, type = 'text') {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'min-width:0;';
  const l = document.createElement('div');
  l.textContent = label;
  l.style.cssText = 'font-size:11px; color:var(--text-dim); margin-bottom:2px;';
  const i = document.createElement('input');
  i.type = type;
  i.value = value ?? '';
  i.style.cssText = 'width:100%; padding:8px; background:var(--bg); border:1px solid var(--surface); color:var(--text); border-radius:6px; font-family:inherit;';
  i.addEventListener('input', () => onChange(i.value));
  wrap.append(l, i);
  return wrap;
}

function makeTextarea(label, value, onChange) {
  const wrap = document.createElement('div'); wrap.style.cssText = 'margin:6px 0;';
  const l = document.createElement('div'); l.textContent = label;
  l.style.cssText = 'font-size:11px; color:var(--text-dim); margin-bottom:2px;';
  const i = document.createElement('textarea'); i.value = value ?? ''; i.rows = 3;
  i.style.cssText = 'width:100%; padding:8px; background:var(--bg); border:1px solid var(--surface); color:var(--text); border-radius:6px; resize:vertical; font-family:inherit;';
  i.addEventListener('input', () => onChange(i.value));
  wrap.append(l, i); return wrap;
}

function blocksToTasks(blocks, date) {
  const out = [];
  for (const b of blocks) {
    let order = 0;
    if (b.powerUp.title) {
      out.push(makeTask(b.powerUp.id, b.powerUp.title, date, b.blockIndex, b.blockTitle,
                       'power_up', b.powerUp.description ?? '', null, b.powerUp.time, order++));
    }
    if (b.yolo.title) {
      out.push(makeTask(b.yolo.id, b.yolo.title, date, b.blockIndex, b.blockTitle,
                       'yolo', '', b.yolo.minMins || null, b.yolo.time, order++));
    }
    for (const r of b.regulars) {
      if (!r.title) continue;
      out.push(makeTask(r.id, r.title, date, b.blockIndex, b.blockTitle,
                       'regular', '', r.minMins || null, r.time, order++));
    }
    if (b.boss.title) {
      out.push(makeTask(b.boss.id, b.boss.title, date, b.blockIndex, b.blockTitle,
                       'boss', '', b.boss.minMins || null, b.boss.time, order++));
    }
  }
  return out;
}

function makeTask(id, title, date, block, blockTitle, type, description, minMins, time, order) {
  return {
    id: id ?? null,
    title, date, block, blockTitle, type, description,
    minMins, time: time || '', order,
    done: false, completedAt: null, energy: ''
  };
}

export function tasksToSkeleton(tasks) {
  const byBlock = new Map();
  for (const t of tasks) {
    if (!byBlock.has(t.block)) byBlock.set(t.block, {
      blockIndex: t.block, blockTitle: t.blockTitle || `Block ${t.block}`,
      powerUp: { id: null, title: '', description: '', time: '' },
      yolo: { id: null, title: '', minMins: 30, time: '' },
      regulars: [],
      boss: { id: null, title: '', minMins: 45, time: '' }
    });
    const b = byBlock.get(t.block);
    if (t.type === 'power_up') {
      b.powerUp.id = t.id; b.powerUp.title = t.title; b.powerUp.description = t.description;
      b.powerUp.time = t.time || '';
    } else if (t.type === 'yolo') {
      b.yolo.id = t.id; b.yolo.title = t.title; b.yolo.minMins = t.minMins ?? 30;
      b.yolo.time = t.time || '';
    } else if (t.type === 'boss') {
      b.boss.id = t.id; b.boss.title = t.title; b.boss.minMins = t.minMins ?? 45;
      b.boss.time = t.time || '';
    } else if (t.type === 'regular') {
      b.regulars.push({ id: t.id, title: t.title, minMins: t.minMins ?? 45, time: t.time || '' });
    }
  }
  return [...byBlock.values()].sort((a, b) => a.blockIndex - b.blockIndex);
}

// Same as tasksToSkeleton but clears titles for boss/regulars — used for the
// "carry forward yesterday into tomorrow" path where you don't want to reuse
// the bosses but DO want to reuse the Power Up + Yolo skeleton.
export function tasksToFreshSkeleton(tasks) {
  const sk = tasksToSkeleton(tasks);
  for (const b of sk) {
    b.boss.id = null;
    b.boss.title = '';
    b.boss.time = '';
    b.regulars = [];
    // Power Up & Yolo skeleton kept but IDs cleared (new tasks for tomorrow)
    b.powerUp.id = null;
    b.yolo.id = null;
  }
  return sk;
}
