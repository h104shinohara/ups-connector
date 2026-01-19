import express from "express";

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).send("OK");
});

app.post("/api/shipping_rates", (req, res) => {
  console.log("=== Shopify callback received ===");
  console.log(JSON.stringify(req.body, null, 2));

  // 疎通確認用：固定レートを1件返す
  res.status(200).json({
    rates: [
      {
        service_name: "UPS Simple Test",
        service_code: "UPS_SIMPLE_TEST",
        total_price: "1000",  // 10.00 USD (cents)
        currency: "USD"
      }
    ]
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});
