import { GoogleGenerativeAI } from "@google/generative-ai";

export const POST = async ({ request }) => {
  try {
    const body = await request.json();
    const { history, message } = body;

    // Recolectar datos del negocio para el contexto de la IA
    const [resInv, resTick, resProd] = await Promise.all([
      fetch(`${import.meta.env.PUBLIC_API_URL}/api/inventory`).catch(() => null),
      fetch(`${import.meta.env.PUBLIC_API_URL}/api/tickets`).catch(() => null),
      fetch(`${import.meta.env.PUBLIC_API_URL}/api/products`).catch(() => null),
    ]);

    let inventory = [], tickets = [], products = [];
    if (resInv && resInv.ok) inventory = (await resInv.json()).inventory || [];
    if (resTick && resTick.ok) tickets = (await resTick.json()).tickets || [];
    if (resProd && resProd.ok) products = (await resProd.json()).products || [];

    // Pequeño análisis para pasarle a Gemini
    const businessData = {
      totalProducts: products.length,
      lowStockProducts: products.filter(p => p.quantity < 30).map(p => `${p.name} (Quedan: ${p.quantity})`),
      totalSalesCount: tickets.length,
      recentSales: tickets.slice(0, 5).map(t => `$${parseFloat(t.finalPrice).toFixed(2)}`),
    };

    const apiKey = import.meta.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "No se encontró GEMINI_API_KEY en .env" }), { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      systemInstruction: `Eres POSI, un analista de datos de Inteligencia Artificial muy potente integrado en el sistema de Punto de Venta POSitive.
Tu trabajo es dar consejos de negocio, analizar métricas, sugerir qué productos impulsar o cuándo buscar nuevos proveedores.
Tu tono es proactivo, muy inteligente, corporativo pero amigable y conversacional. NUNCA des formato markdown excesivo, mantén las respuestas como si fuera un chat rápido (párrafos cortos).

DATOS EN TIEMPO REAL DEL NEGOCIO:
- Productos registrados: ${businessData.totalProducts}
- Productos con stock críticamente bajo (<30 uds): ${businessData.lowStockProducts.length > 0 ? businessData.lowStockProducts.join(", ") : "Ninguno"}
- Total de tickets históricos: ${businessData.totalSalesCount}
- Últimos ingresos registrados: ${businessData.recentSales.join(", ")}

Si es tu primer mensaje (cuando el usuario envía el comando especial INIT_GREETING), DEBES empezar exactamente diciendo: "Hola soy POSI, tu analista de datos." y seguido de eso, dar un pequeño consejo o dato curioso sobre su negocio basado en los datos anteriores. Para el resto de mensajes, simplemente responde a la pregunta.`
    });

    const chat = model.startChat({
      history: history || []
    });

    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    return new Response(JSON.stringify({ response: responseText }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error al consultar a POSI:", error);
    return new Response(JSON.stringify({ error: "Ocurrió un error al analizar los datos. Intenta nuevamente." }), { status: 500 });
  }
};
