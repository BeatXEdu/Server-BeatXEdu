self.onmessage = ({data}) => {
  let x = 0x12345678, ops = 0;
  const until = data.until;
  while (performance.now() < until) {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    x = Math.imul(x, 1664525) + 1013904223;
    ops += 8;
  }
  self.postMessage({ops});
};
