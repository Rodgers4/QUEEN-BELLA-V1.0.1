const { default: makeWASocket, useSingleFileAuthState, DisconnectReason } = require("@adiwajshing/baileys");
const { Boom } = require("@hapi/boom");
const express = require('express');
const fs = require("fs");
const { chatbotReply } = require("./chatbot");
require("dotenv").config();

const { state, saveState } = useSingleFileAuthState("./session.json");

const ownerNumber = "254755660053@s.whatsapp.net"; // Rodgers' number

async function connectToWhatsApp() {
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true
    });

    sock.ev.on("creds.update", saveState);

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        }
    });

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.remoteJid === "status@broadcast") return;

        const sender = msg.key.remoteJid;

        if (sender !== ownerNumber) return; // Only reply to messages sent to your number

        const message = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        if (message.startsWith(".")) {
            if (message === ".menu") {
                const commands = `
┌─『 𝐐𝐔𝐄𝐄𝐍 𝐁𝐄𝐋𝐋𝐀 』─┐
│ 👑 Owner: Rodgers
│ 🧿 Prefix: [.]
│ 🔐 Mode: Private
│
│ .menu - List commands
│ .info - Bot info
│ .chatbot on/off - Toggle chatbot
│ .status - View status
│ .ping - Check bot uptime
│ .gpt [text] - GPT reply
│ .gemini [text] - Gemini reply
│ .help - Help info
└───────────────
                `;
                await sock.sendMessage(sender, { image: { url: "./assets/banner.jpg" }, caption: commands });
            } else if (message === ".info") {
                await sock.sendMessage(sender, {
                    text: `👑 The bot owner: Rodgers\n📞 Number: +254755660053\n🏢 Company: RoyTech Devs`,
                    footer: "Tap below to visit our WhatsApp Channel",
                    buttons: [
                        {
                            buttonId: "view_channel",
                            buttonText: { displayText: "📢 View Channel" },
                            type: 1,
                        }
                    ]
                });
            } else if (message.startsWith(".chatbot ")) {
                const toggle = message.split(" ")[1];
                fs.writeFileSync("chatbot_mode.txt", toggle === "on" ? "on" : "off");
                await sock.sendMessage(sender, { text: `🤖 Chatbot is now ${toggle.toUpperCase()}` });
            } else if (message.startsWith(".gpt ")) {
                const input = message.replace(".gpt ", "");
                const reply = await chatbotReply("gpt", input);
                await sock.sendMessage(sender, { text: reply });
            } else if (message.startsWith(".gemini ")) {
                const input = message.replace(".gemini ", "");
                const reply = await chatbotReply("gemini", input);
                await sock.sendMessage(sender, { text: reply });
            }
        } else {
            const chatbotStatus = fs.existsSync("chatbot_mode.txt") ? fs.readFileSync("chatbot_mode.txt", "utf-8") : "off";
            if (chatbotStatus === "on") {
                const reply = await chatbotReply("gpt", message);
                await sock.sendMessage(sender, { text: `Roy is currently unavailable, can we chat? I'm a bot.\n\n${reply}` });
            }
        }
    });
}

connectToWhatsApp();
