const express = require("express");
const { GoogleGenAI } = require("@google/genai");
const db = require("../config/db");
const util = require("util");

const router = express.Router();
const query = util.promisify(db.query).bind(db);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

router.post("/", async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_gemini_api_key_here") {
       return res.status(500).json({ error: "API key is missing or invalid. Please configure GEMINI_API_KEY in the backend .env file." });
    }

    const arabicWilayas = ["أدرار","الشلف","الأغواط","أم البواقي","باتنة","بجاية","بسكرة","بشار","البليدة","البويرة","تمنراست","تبسة","تلمسان","تيارت","تيزي وزو","الجزائر","الجلفة","جيجل","سطيف","سعيدة","سكيكدة","سيدي بلعباس","عنابة","قالمة","قسنطينة","المدية","مستغانم","المسيلة","معسكر","ورقلة","وهران","البيض","إليزي","برج بوعريريج","بومرداس","الطارف","تندوف","تيسمسيلت","الوادي","خنشلة","سوق أهراس","تيبازة","ميلة","عين الدفلى","النعامة","عين تموشنت","غرداية","غليزان","تيميمون","برج باجي مختار","أولاد جلال","بني عباس","عين صالح","عين قزام","تقرت","جانت","المغير","المنيعة"];
    // Fetch delivery prices from database
    let deliveryDataText = "Delivery pricing not available.";
    let deliveryList = [];
    try {
      const deliveryRows = await query(
        "SELECT w.id, w.name as wilaya, d.price_stopdesk, d.price_domicile FROM Wilaya w JOIN Delivery d ON w.id = d.wilaya_id ORDER BY w.id ASC"
      );
      if (deliveryRows && deliveryRows.length > 0) {
        deliveryList = deliveryRows.map(row => ({
           ...row,
           arabicName: arabicWilayas[row.id - 1] || ""
        }));
        deliveryDataText = deliveryList.map(row => 
          `- ${row.wilaya}: Stopdesk (Office/Pickup) ${row.price_stopdesk} DZD, Domicile (Home Delivery) ${row.price_domicile} DZD`
        ).join("\\n");
      }
    } catch (dbError) {
      console.error("Error fetching delivery prices for chatbot:", dbError);
    }

    // Check for order tracking interception (Phone number based)
    let orderContextText = "";
    const cleanMessage = message.replace(/[\s-]/g, "");
    const phoneMatch = cleanMessage.match(/(?:0|\+213)[567]\d{8}/);
    if (phoneMatch) {
      const phoneSuffix = phoneMatch[0].slice(-9);
      try {
        const orderRows = await query("SELECT id, status, total_price, created_at FROM `Order` WHERE client_phone LIKE ? AND status IN ('pending', 'confirmed') ORDER BY created_at DESC LIMIT 3", [`%${phoneSuffix}`]);
        if (orderRows && orderRows.length > 0) {
          const ordersDetails = orderRows.map(o => `Order #${o.id} (Status: '${o.status}', Total: ${o.total_price} DZD)`).join(" | ");
          orderContextText = `\n\nCRITICAL CONTEXT FOR THIS REQUEST: The user provided their phone number. They have the following recent orders: ${ordersDetails}. Please politely inform the user about these orders.`;
        } else {
          orderContextText = `\n\nCRITICAL CONTEXT FOR THIS REQUEST: The user provided a phone number, but NO orders were found for it. Politely inform them that no orders match this phone number and ask them to verify it.`;
        }
      } catch (dbError) {
         console.error("Error fetching order by phone for chatbot:", dbError);
      }
    }

    const systemInstruction = `You are a helpful customer support chatbot for an Algerian headwear store called CapZone. 

IMPORTANT CONVERSATION RULES:
1. NEVER give a full list of delivery prices. If the user asks about delivery, politely ask them which wilaya they want. Once they provide the wilaya, give them ONLY that wilaya's price. Provide both options: Stopdesk (Office/Pickup point) and Domicile (Home delivery) with a brief description of each.
2. If the user asks to track an order, politely ask them to provide the phone number they used for the order. 
3. CRITICAL: Always reply in the EXACT same language the user uses. If they speak Arabic or Derja, reply in Arabic/Derja. If French, reply in French. If English, English.

When answering about delivery prices, YOU MUST ONLY use the data provided below. Do NOT make up or guess details. If a wilaya is not listed, state we only deliver to the 58 wilayas of Algeria.

CapZone Delivery Prices:
${deliveryDataText}
${orderContextText}`;

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: message,
        config: {
          systemInstruction: systemInstruction,
        }
      });
      return res.json({ reply: response.text });
    } catch (apiError) {
      console.error("Error communicating with Gemini API:", apiError);
      
      const isQuotaError = apiError.message && (apiError.message.includes("quota") || apiError.message.includes("429"));
      
      if (isQuotaError) {
        // Fallback Logic when API is rate-limited
        const msgLower = message.toLowerCase();
        
        if (orderContextText && orderContextText !== "") {
           let userFriendlyText = orderContextText;
           if (userFriendlyText.includes("but NO orders were found")) {
             userFriendlyText = "Sorry, I couldn't find any pending or confirmed orders matching that phone number. / Désolé, aucune commande trouvée. / عذرا، لم نتمكن من العثور على أي طلبية.";
           } else {
             const parts = userFriendlyText.split("recent orders: ");
             if (parts.length > 1) {
               userFriendlyText = "Here are your recent orders / Voici vos commandes / إليك طلبياتك: " + parts[1].replace(". Please politely inform the user about these orders.", "");
             }
           }
           return res.json({ reply: `(Fallback Mode) ${userFriendlyText}` });
        } else if (/(?:0|\\+213)[567]\\d{8}/.test(message.replace(/[\\s-]/g, ""))) {
           return res.json({ reply: "(Fallback Mode) Sorry, I couldn't find any pending or confirmed orders matching that phone number. / Désolé, aucune commande trouvée. / عذرا، لم يتم العثور على طلبيات." });
        } else if (msgLower.includes("track") || msgLower.includes("order") || msgLower.includes("commande") || msgLower.includes("طلبية") || msgLower.includes("تتبع")) {
           return res.json({ reply: "(Fallback Mode) Please provide the phone number you used for your order. / Veuillez fournir votre numéro de téléphone. / يرجى تقديم رقم الهاتف الخاص بالطلبية." });
        }
        
        // Check if message mentions ANY specific wilaya (in English/French OR Arabic)
        const foundWilaya = deliveryList.find(w => msgLower.includes(w.wilaya.toLowerCase()) || (w.arabicName && message.includes(w.arabicName)));
        if (foundWilaya) {
           return res.json({ reply: `(Fallback Mode) Delivery to ${foundWilaya.wilaya} / التوصيل إلى ${foundWilaya.arabicName}:\\n- Stopdesk (Pickup/Point de relais): ${foundWilaya.price_stopdesk} DZD\\n- Domicile (Home/Maison): ${foundWilaya.price_domicile} DZD` });
        }
        
        // General Intents
        if (msgLower.includes("delivery") || msgLower.includes("shipping") || msgLower.includes("wilaya") || msgLower.includes("livraison") || msgLower.includes("توصيل")) {
           return res.json({ reply: "(Fallback Mode) Which wilaya do you want delivery to? / Quelle wilaya ? / إلى أي ولاية تريد التوصيل؟" });
        }
        
        return res.json({ reply: "(Fallback Mode) The AI is currently resting. Please ask about delivery or order tracking directly! / L'IA se repose. Veuillez demander directement la livraison ou les commandes ! / الذكاء الاصطناعي في فترة راحة. يرجى السؤال مباشرة عن التوصيل أو الطلبيات!" });
      }

      return res.status(500).json({ error: "Failed to communicate with AI" });
    }
  } catch (error) {
    console.error("General error in chatbot route:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
