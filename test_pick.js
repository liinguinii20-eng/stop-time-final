const pick = (obj, ...keys) => {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
};
const obj = { permitir_merma: true };
console.log(pick(obj, 'permitir_merma') || false);
const obj2 = { permitir_merma: false };
console.log(pick(obj2, 'permitir_merma') || false);
