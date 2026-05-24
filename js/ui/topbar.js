import { levelForTotalXp, xpToNextLevel } from '../lib/level.js';

export function renderTopbar({ totalLifetimeXp, todayXp, streak }) {
  const level = levelForTotalXp(totalLifetimeXp);
  const toNext = xpToNextLevel(totalLifetimeXp);
  const pct = (toNext + todayXp) === 0 ? 0 : Math.min(100, (todayXp / Math.max(todayXp + toNext, 1)) * 100);

  document.getElementById('level-badge').textContent = `Lv ${level}`;
  document.getElementById('streak').textContent = `🔥 ${streak}`;
  document.getElementById('xp-fill').style.width = `${pct}%`;
  document.getElementById('xp-text').textContent = `${todayXp} XP today`;
}
