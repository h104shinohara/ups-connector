import axios from 'axios';

const UPS_BASE_URL = 'https://onlinetools.ups.com'; // 本番URL

async function getUpsToken() {
  const clientId = process.env.UPS_CLIENT_ID;
  const clientSecret = process.env.UPS_CLIENT_SECRET;
  
  // ID/Secretが設定されていない場合のチェック
  if (!clientId || !clientSecret) {
    console.error("Error: UPS credentials are missing in .env file.");
    throw new Error("Missing UPS credentials");
  }

  const credentials = btoa(`${clientId}:${clientSecret}`);
  
  try {
    const response = await axios.post(
      `${UPS_BASE_URL}/security/v1/oauth/token`,
      new URLSearchParams({ grant_type: 'client_credentials' }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        }
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error('UPS Token Error:', error.response?.data || error.message);
    throw new Error('Failed to get UPS token');
  }
}

export async function getUpsRates(boxes, destinationAddress) {
  try {
    const token = await getUpsToken();
    
    const packages = boxes.map(box => ({
      PackagingType: { Code: '02' },
      Dimensions: {
        UnitOfMeasurement: { Code: 'IN' },
        Length: String(box.w),
        Width: String(box.h),
        Height: String(box.d)
      },
      PackageWeight: {
        UnitOfMeasurement: { Code: 'LBS' },
        Weight: String(Math.max(box.weight, 1))
      }
    }));

    const payload = {
      RateRequest: {
        Request: { TransactionReference: { CustomerContext: "ShopifyRateCalc" } },
        Shipment: {
          Shipper: {
            Address: {
              PostalCode: process.env.SHIPPER_ZIP,
              CountryCode: process.env.SHIPPER_COUNTRY
            }
          },
          ShipTo: {
            Address: {
              PostalCode: destinationAddress.postal_code,
              CountryCode: destinationAddress.country_code,
              StateProvinceCode: destinationAddress.province_code,
              City: destinationAddress.city
            }
          },
          ShipmentRatingOptions: {}, 
          Service: { Code: "03", Description: "UPS Ground" },
          Package: packages,
          CustomerClassification: { Code: "04" } 
        }
      }
    };

    const response = await axios.post(
      `${UPS_BASE_URL}/api/rating/v1/Shop`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const ratedShipment = response.data.RateResponse.RatedShipment;
    const shipmentData = Array.isArray(ratedShipment) ? ratedShipment[0] : ratedShipment;
    
    return {
        price: shipmentData.TotalCharges.MonetaryValue,
        currency: shipmentData.TotalCharges.CurrencyCode
    };

  } catch (error) {
    console.error('UPS Rate Error:', JSON.stringify(error.response?.data, null, 2));
    return null;
  }
}