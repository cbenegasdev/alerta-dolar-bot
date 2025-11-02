import fetch from "node-fetch";
import express from "express";

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const API_URL = "https://api.bluelytics.com.ar/v2/latest";

let umbral = 1420;
let ultimoValor = null;

// === Funciones auxiliares ===
async function obtenerDolar() {
  const res = await fetch(API_URL);
  const data = await res.json();
  return {
    oficial: data.oficial.value_sell,
    blue: data.blue.value_sell,
    lastUpdate: data.last_update
  };
}

async function enviarMensaje(texto) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${encodeURIComponent(texto)}`);
}

// === Servidor Express ===
const app = express();
app.use(express.json());
app.get('/hola', async (req, res) => {
  res.send({'hola':'mundo'})
})

app.post(`/webhook/${BOT_TOKEN}`, async (req, res) => {
  const message = req.body.message;
  console.log(req.body)
  if (!message || !message.text) return res.sendStatus(200);

  const text = message.text.trim();

  if (text.startsWith("/setumbral")) {
    const partes = text.split(" ");
    const nuevoUmbral = parseFloat(partes[1]);
    if (!isNaN(nuevoUmbral)) {
      umbral = nuevoUmbral;
      await enviarMensaje(`✅ Umbral actualizado a $${umbral}`);
    } else {
      await enviarMensaje("⚠️ Uso correcto: /setumbral [número]");
    }

  } else if (text === "/umbral") {
    await enviarMensaje(`📊 Umbral actual: $${umbral}`);

  } else if (text === "/dolar") {
    const { oficial, blue, lastUpdate } = await obtenerDolar();
    await enviarMensaje(`💵 Cotización actual:\n• Oficial: $${oficial}\n• Blue: $${blue}\n LastUpdate: ${lastUpdate}`);

  } else {
    await enviarMensaje(
      "🤖 Comandos disponibles:\n" +
      "/dolar → Ver cotización actual\n" +
      "/umbral → Ver umbral actual de dolar oficial\n" +
      "/setumbral [valor] → Cambiar umbral de dolar oficial"
    );
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));

// === Verificación automática del dólar ===
async function verificar() {
  try {
    const { oficial } = await obtenerDolar();
    console.log("💵 Dólar oficial:", oficial);

    if (ultimoValor && oficial !== ultimoValor) {
      if (oficial > umbral && ultimoValor <= umbral)
        await enviarMensaje(`🚨 El dólar superó los $${umbral}! Ahora está en $${oficial}`);
      if (oficial < umbral && ultimoValor >= umbral)
        await enviarMensaje(`✅ El dólar bajó por debajo de $${umbral}. Ahora está en $${oficial}`);
    }

    ultimoValor = oficial;
  } catch (err) {
    console.error("Error en verificación:", err);
  }
}

setInterval(verificar, 10 * 60 * 1000); // cada 10 min
verificar();
