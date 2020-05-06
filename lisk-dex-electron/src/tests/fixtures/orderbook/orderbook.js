// Price in LSK per leasehold, Amount in leaseholds
const asks = [
  { price: 0.9500, amount: 2000.0000 },
  { price: 0.9000, amount: 913.4444 },
  { price: 0.8700, amount: 66.7126 },
  { price: 0.8500, amount: 6.4706 },
  { price: 0.8000, amount: 10.0000 },
  { price: 0.7700, amount: 3.1169 },
];

// Price in LSK per leasehold, Amount in lisks
const bids = [
  { price: 0.6000, amount: 91.7376 },
  { price: 0.4000, amount: 62.6993 },
  { price: 0.3000, amount: 8.7704 },
  { price: 0.2500, amount: 15.0000 },
  { price: 0.2000, amount: 10.0000 },
];

export { asks, bids };

// Test Cases -> against asks
// 2910 -> 0.96  -> match -> 2793.6
// 2970 -> 0.95  -> match -> 2821.5
// 2995 -> 0.95  -> match -> 2845.25
// 72 -> 0.88 -> match -> 63.36
// 90 -> 0.88 -> partial -> 79.2
// 98 -> 0.778 -> no_match -> 76.244
// 100 -> 0.78 -> no_match -> 78
// 1234 -> 0.79 -> no_match -> 974.86
//
// Test Cases -> against bids
// 170 -> 0.23 -> match -> 739.130434783
// 180 -> 0.19 -> match -> 947.368421053
// 180 -> 0.22 -> partial -> 818.181818182
// 200 -> 0.61 -> no_match -> 327.868852459
// 160 -> 0.35 -> partial -> 457.142857143
// 900 -> 0.602 -> no_match -> 1495.0166113
