import { json } from "@remix-run/node";
import { findOptimalBoxes } from "../services/packer";
import { getUpsRates } from "../services/upsService";

// ShopifyからのPOSTリクエストを受け取る関数
export const action = async ({ request }) => {
  try {
    const body = await request.json();
    const { rate } = body; // Shopifyから送られてきたカート情報
    
    console.log("---------------------------------------------------");
    console.log(`Received request: ${rate.items.length} items to ${rate.destination.city}`);

    // 1. 商品データの整形 (グラム -> ポンド変換)
    const items = rate.items.map(item => ({
      name: item.name,
      // 寸法データがない場合は仮で 5x5x5 を入れる
      w: 5, h: 5, d: 5, 
      weight: item.grams * 0.00220462 // gをlbsに変換
    }));

    // 2. 箱詰め計算を実行
    const optimalBoxes = findOptimalBoxes(items);
    
    if (!optimalBoxes) {
      console.log("Error: Items did not fit in any box.");
      return json({ rates: [] });
    }
    console.log(`Packed into: ${optimalBoxes.map(b => b.name).join(' + ')}`);

    // 3. UPSから送料を取得
    const upsRate = await getUpsRates(optimalBoxes, rate.destination);

    if (!upsRate) {
        console.log("Error: Failed to get rates from UPS API.");
        return json({ rates: [] });
    }

    // 4. Shopifyに送料を返す
    const boxNames = optimalBoxes.map(b => b.name).join(' + ');
    const totalPriceCents = Math.round(parseFloat(upsRate.price) * 100);

    console.log(`Returning Rate: $${upsRate.price} (${boxNames})`);
    console.log("---------------------------------------------------");

    return json({
      rates: [
        {
          service_name: `UPS Ground (Box: ${boxNames})`,
          service_code: "ups_ground_optimized",
          total_price: totalPriceCents,
          currency: upsRate.currency,
          description: `Packed in ${boxNames}`,
          min_delivery_date: "",
          max_delivery_date: ""
        }
      ]
    });

  } catch (error) {
    console.error("API Error:", error);
    return json({ rates: [] }, { status: 500 });
  }
};