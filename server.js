const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { VoiceResponse } = require("twilio").twiml;
require("dotenv").config();

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", (req, res) => {
    console.log("/ route encountered")
  res.send("🎉 Server is live and reachable via ngrok!");
});


// Entry point: When Twilio gets a call
app.post("/voice", (req, res) => {
    console.log("/voice encountered")
  const twiml = new VoiceResponse();

  const gather = twiml.gather({
    input: "speech",
    timeout: 5,
    action: "/gather",
  });

  gather.say("Hi! How can I help you today?");
  res.type("text/xml");
  res.send(twiml.toString());
});

async function getLLMResponse(prompt) {
  const endpoint = `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${process.env.AZURE_OPENAI_API_VERSION}`;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;

  try {
    const response = await axios.post(
      endpoint,
      {
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: prompt }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (err) {
    console.error("Error calling Azure LLM:", err.message);
    return "Sorry, there was an error processing your request.";
  }
}

// After user speaks, Twilio sends us transcript
app.post("/gather", async (req, res) => {
    console.log("/gather route encountered")
  const userText = req.body?.SpeechResult;

  console.log("User said:", userText);

  const llmReply = await getLLMResponse(userText);

  const twiml = new VoiceResponse();
  twiml.say(llmReply);

  res.type("text/xml");
  res.send(twiml.toString());
});

app.listen(process.env.PORT, () =>
  console.log(`Server listening on port ${process.env.PORT}`)
);
