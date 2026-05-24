export function levelForTotalXp(totalXp) {
  return Math.floor(Math.sqrt(totalXp / 50));
}

export function xpToNextLevel(totalXp) {
  const lvl = levelForTotalXp(totalXp);
  return (lvl + 1) ** 2 * 50 - totalXp;
}
