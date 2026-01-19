import bp3d from 'bp3d';
const { Packer, Bin, Item } = bp3d;

// 箱マスタ (インチ/ポンド)
const BOX_TYPES = [
  { name: 'S', w: 1, h: 1, d: 1, maxWeight: 10 },
  { name: 'M', w: 5, h: 5, d: 5, maxWeight: 20 },
  { name: 'L', w: 14, h: 14, d: 14, maxWeight: 50 }
];

export function findOptimalBoxes(items) {
  // 試行1: 単一の箱（S -> M -> L）で試す
  for (const boxType of BOX_TYPES) {
    const packer = new Packer();
    const bin = new Bin(boxType.name, boxType.w, boxType.h, boxType.d, boxType.maxWeight);
    packer.addBin(bin);

    items.forEach(item => {
      // 寸法がない商品はデフォルト値(5x5x5)を入れる
      const w = item.w || 5;
      const h = item.h || 5;
      const d = item.d || 5;
      packer.addItem(new Item(item.name, w, h, d, item.weight));
    });

    packer.pack();

    if (packer.bins.length > 0 && packer.unfitItems.length === 0) {
        return [boxType]; 
    }
  }

  // 試行2: L箱複数個に分割
  const packer = new Packer();
  const lBox = BOX_TYPES.find(b => b.name === 'L');
  
  items.forEach(item => {
      const w = item.w || 5;
      const h = item.h || 5;
      const d = item.d || 5;
      packer.addItem(new Item(item.name, w, h, d, item.weight));
  });

  for(let i=0; i<10; i++) { 
      packer.addBin(new Bin(lBox.name, lBox.w, lBox.h, lBox.d, lBox.maxWeight));
  }

  packer.pack();

  if (packer.unfitItems.length > 0) return null;

  const usedBins = packer.bins.filter(bin => bin.items.length > 0);
  
  return usedBins.map(bin => ({
      name: bin.name,
      w: bin.width,
      h: bin.height,
      d: bin.depth,
      weight: bin.items.reduce((sum, item) => sum + item.weight, 0)
  }));
}