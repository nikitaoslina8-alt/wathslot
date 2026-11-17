const TELEGRAM_API = "https://api.telegram.org";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "На сайте ещё не настроен приём заказов. Напишите продавцу другим способом." }) };
  }

  let order;
  try {
    order = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Некорректные данные формы" }) };
  }

  const pickup = order.delivery === "Самовывоз — Жодино";
  const required = pickup ? ["fio", "phone"] : ["fio", "phone", "city", "address"];
  if (required.some((key) => typeof order[key] !== "string" || !order[key].trim())) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Заполните все обязательные поля" }) };
  }
  if (!["Белпочта", "Европочта", "Самовывоз — Жодино"].includes(order.delivery)) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Выберите способ получения" }) };
  }
  if (pickup) order.city = "Жодино";

  const quantity = Number(order.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Некорректное количество товара" }) };
  }

  const safe = (value) => String(value).trim().slice(0, 500);
  const message = [
    "🛍 НОВЫЙ ЗАКАЗ — WATHSLOT",
    "",
    `⌚ Товар: Часы Roulette Black`,
    `💰 Цена: 50 BYN × ${quantity} = ${quantity * 50} BYN`,
    "",
    `👤 ФИО: ${safe(order.fio)}`,
    `📞 Телефон: ${safe(order.phone)}`,
    `📍 Город и область: ${safe(order.city)}`,
    ...(pickup ? [] : [`📮 Адрес / отделение: ${safe(order.address)}`]),
    `🚚 Получение: ${order.delivery}`,
    "",
    "Оплата при получении — уточнить с покупателем."
  ].join("\n");

  try {
    const tgResponse = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message })
    });
    const tgResult = await tgResponse.json();
    if (!tgResponse.ok || !tgResult.ok) {
      return { statusCode: 502, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Не удалось передать заказ в Telegram. Попробуйте позже." }) };
    }
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true }) };
  } catch {
    return { statusCode: 502, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Ошибка связи. Попробуйте позже." }) };
  }
};
