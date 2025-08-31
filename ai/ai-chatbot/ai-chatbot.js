const express = require('express');
const { Configuration, OpenAIApi } = require('openai');
const si = require('systeminformation');

const OPENAI_KEY = 'YOUR_OPENAI_API_KEY'; // Replace with your actual OpenAI API key

const configuration = new Configuration({ apiKey: OPENAI_KEY });
const openai = new OpenAIApi(configuration);
const app = express();
app.use(express.json());

async function getNodeStatus() {
  const cpu = await si.currentLoad();
  const mem = await si.mem();
  return `CPU: ${cpu.currentLoad.toFixed(2)}%, RAM: ${(mem.used / mem.total * 100).toFixed(2)}%`;
}

app.post('/ai-chat', async (req, res) => {
  const { message } = req.body;
  let sysPrompt = "You are an assistant for a Raspberry Pi supernode. You can answer questions about node status and system info. If asked for status, provide CPU and RAM usage.";
  let fullPrompt = `${sysPrompt}\nUser: ${message}\nAssistant:`;

  // Example: Special handling for "status" queries
  if (/status|cpu|ram|memory/i.test(message)) {
    res.json({ reply: await getNodeStatus() });
    return;
  }

  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo", // Change to "gpt-4" if enabled on your account
    messages: [
      { role: "system", content: sysPrompt },
      { role: "user", content: message }
    ]
  });
  res.json({ reply: response.data.choices[0].message.content });
});

const PORT = 3010;
app.listen(PORT, () => console.log(`AI Chatbot running on port ${PORT}`));