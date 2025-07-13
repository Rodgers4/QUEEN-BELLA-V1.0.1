const { GoogleGenerativeAI } = require("@google/generative-ai");
const { OpenAI } = require("openai");

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const gpt = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function chatbotReply(provider, text) {
    if (provider === "gemini") {
        const model = gemini.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent(text);
        return result.response.text();
    } else {
        const chat = await gpt.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: text }],
        });
        return chat.choices[0].message.content;
    }
}

module.exports = { chatbotReply };
