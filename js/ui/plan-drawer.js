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
    powerUp:  { title: 'Power Up', description: '1. Eat\n2. Call\n3. Text' },
    yolo:     { title: 'Yolo task', minMins: 30 },
    regulars: [],
    boss:     { title: '', minMins: 45 }
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

  card.appendChild(makeField('Power Up title', b.powerUp.title, v => b.powerUp.title = v));
  card.appendChild(makeTextarea('Power Up sub-items', b.powerUp.description, v => b.powerUp.description = v));
  card.appendChild(makeFieldPair('Yolo title', b.yolo.title, v => b.yolo.title = v, 'Min', b.yolo.minMins, v => b.yolo.minMins = Number(v) || null));

  const regHeader = document.createElement('div');
  regHeader.textContent = 'Other tasks';
  regHeader.style.cssText = 'font-size:13px; color:var(--text-dim); margin:10px 0 4px;';
  card.appendChild(regHeader);
  b.regulars.forEach((r, ri) => {
    card.appendChild(makeFieldPairWithRemove(
      'Title', r.title, v => r.title = v,
      'Min', r.minMins ?? 0, v => r.minMins = Number(v) || null,
      () => { b.regulars.splice(ri, 1); rerender(); }
    ));
  });
  const addReg = document.createElement('button');
  addReg.textContent = '+ Add task';
  addReg.style.cssText = 'background:transparent; color:var(--text-dim); border:1px dashed var(--surface); padding:6px; border-radius:6px; width:100%; font-size:13px; margin-top:4px;';
  addReg.addEventListener('click', () => { b.regulars.push({ title: '', minMins: 45 }); rerender(); });
  card.appendChild(addReg);

  card.appendChild(makeFieldPair('⚔ Boss title', b.boss.title, v => b.boss.title = v, 'Min', b.boss.minMins, v => b.boss.minMins = Number(v) || null));

  return card;
}

function makeField(label, value, onChange) {
  const wrap = document.createElement('div'); wrap.style.cssText = 'margin: 6px 0;';
  const l = document.createElement('div'); l.textContent = label;
  l.style.cssText = 'font-size:11px; color:var(--text-dim); margin-bottom:2px;';
  const i = document.createElement('input'); i.value = value ?? '';
  i.style.cssText = 'width:100%; padding:8px; background:var(--bg); border:1px solid var(--surface); color:var(--text); border-radius:6px;';
  i.addEventListener('input', () => onChange(i.value));
  wrap.append(l, i); return wrap;
}

function makeTextarea(label, value, onChange) {
  const wrap = document.createElement('div'); wrap.style.cssText = 'margin:6px 0;';
  const l = document.createElement('div'); l.textContent = label;
  l.style.cssText = 'font-size:11px; color:var(--text-dim); margin-bottom:2px;';
  const i = document.createElement('textarea'); i.value = value ?? ''; i.rows = 3;
  i.style.cssText = 'width:100%; padding:8px; background:var(--bg); border:1px solid var(--surface); color:var(--text); border-radius:6px; resize:vertical;';
  i.addEventListener('input', () => onChange(i.value));
  wrap.append(l, i); return wrap;
}

function makeFieldPair(l1, v1, on1, l2, v2, on2) {
  const wrap = document.createElement('div'); wrap.style.cssText = 'display:flex; gap:8px; margin:6px 0;';
  const m = makeField(l1, v1, on1); m.style.flex = '3';
  const n = makeField(l2, v2, on2); n.style.flex = '1';
  wrap.append(m, n); return wrap;
}

function makeFieldPairWithRemove(l1, v1, on1, l2, v2, on2, onRemove) {
  const wrap = document.createElement('div'); wrap.style.cssText = 'display:flex; gap:6px; align-items:flex-end; margin:4px 0;';
  const m = makeField(l1, v1, on1); m.style.flex = '3';
  const n = makeField(l2, v2, on2); n.style.flex = '1';
  const rm = document.createElement('button'); rm.textContent = '×';
  rm.style.cssText = 'background:transparent; color:var(--text-dim); border:none; font-size:20px; padding:0 6px;';
  rm.addEventListener('click', onRemove);
  wrap.append(m, n, rm); return wrap;
}

function blocksToTasks(blocks, date) {
  const out = [];
  for (const b of blocks) {
    let order = 0;
    if (b.powerUp.title) {
      out.push({ title: b.powerUp.title, date, block: b.blockIndex, blockTitle: b.blockTitle,
                 type: 'power_up', description: b.powerUp.description ?? '', minMins: null,
                 order: order++, done: false, completedAt: null, energy: '' });
    }
    if (b.yolo.title) {
      out.push({ title: b.yolo.title, date, block: b.blockIndex, blockTitle: b.blockTitle,
                 type: 'yolo', description: '', minMins: b.yolo.minMins || null,
                 order: order++, done: false, completedAt: null, energy: '' });
    }
    for (const r of b.regulars) {
      if (!r.title) continue;
      out.push({ title: r.title, date, block: b.blockIndex, blockTitle: b.blockTitle,
                 type: 'regular', description: '', minMins: r.minMins || null,
                 order: order++, done: false, completedAt: null, energy: '' });
    }
    if (b.boss.title) {
      out.push({ title: b.boss.title, date, block: b.blockIndex, blockTitle: b.blockTitle,
                 type: 'boss', description: '', minMins: b.boss.minMins || null,
                 order: order++, done: false, completedAt: null, energy: '' });
    }
  }
  return out;
}

export function tasksToSkeleton(tasks) {
  const byBlock = new Map();
  for (const t of tasks) {
    if (!byBlock.has(t.block)) byBlock.set(t.block, {
      blockIndex: t.block, blockTitle: t.blockTitle || `Block ${t.block}`,
      powerUp: { title: '', description: '' },
      yolo: { title: '', minMins: 30 },
      regulars: [],
      boss: { title: '', minMins: 45 }
    });
    const b = byBlock.get(t.block);
    if (t.type === 'power_up') { b.powerUp.title = t.title; b.powerUp.description = t.description; }
    else if (t.type === 'yolo') { b.yolo.title = t.title; b.yolo.minMins = t.minMins ?? 30; }
    else if (t.type === 'boss') { b.boss.minMins = t.minMins ?? 45; }
  }
  return [...byBlock.values()].sort((a, b) => a.blockIndex - b.blockIndex);
}
