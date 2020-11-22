const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const request = require("request");
const path = require("path");
const fetch = require("node-fetch");
const { Storage } = require("@google-cloud/storage");
const { Firestore } = require("@google-cloud/firestore");

const { botToken } = require("./keys.json");
// console.log(botToken);

const storage = new Storage({
  keyFilename: "./bot-key.json",
});

const firestore = new Firestore({
  keyFilename: "./bot-key.json",
});

const document = firestore.doc("posts/intro-to-firestore");

let bucketName = "tl-dl-bot.appspot.com";

const uploadFile = async (filename) => {
  await storage.bucket(bucketName).upload(filename, {
    gzip: false,
    metadata: {
      cacheControl: "public, max-age=31536000",
    },
  });
};

const download = (url, path, callback) => {
  request.head(url, (err, res, body) => {
    request(url).pipe(fs.createWriteStream(path)).on("close", callback);
  });
};

const bot = new TelegramBot(botToken, {
  polling: true,
});

function makeid(length) {
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

bot.on("message", async (msg) => {
  console.log(msg);
  console.log("==========================");
  const chatId = msg.chat.id;
  if (msg.voice) {
    const audioID = msg.voice.file_id;
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${audioID}`
    );

    const res2 = await res.json();
    const filePath = res2.result.file_path;
    // const filename = filePath.split("/")[1].split(".")[0];
    const filename = makeid(32);
    const downloadURL = `https://api.telegram.org/file/bot${botToken}/${filePath}`;

    download(downloadURL, path.join(__dirname, `${filename}.ogg`), async () => {
      console.log("Done!");
      console.log("uploading...");
      try {
        await uploadFile(`./${filename}.ogg`);

        fs.unlink(path.join(__dirname, `${filename}.ogg`), (err) => {
          if (err) {
            console.error(err);
            return;
          }
        });

        console.log("SUCCESS");
        bot.sendMessage(chatId, `um momento, estou escutando o audio... 🧘🏿‍♀️`);
        const timeout = setTimeout(() => {
          bot.sendMessage(chatId, `erro analizando o audio 🤖`);
          unsubscribe();
        }, 10000);
        const unsubscribe = firestore
          .collection("audios")
          .doc(`${filename}.ogg`)
          .onSnapshot((snapshot) => {
            if (snapshot.exists) {
              const data = snapshot.data();
              if (!data.transcription) {
                // const botResponse = "erro acessando o audio";
                bot.sendMessage(chatId, `erro analizando o audio 🤖`);
              } else {
                bot.sendMessage(chatId, `"${data.transcription}"`);
              }
              unsubscribe();
              clearTimeout(timeout);
            }
          });
      } catch (err) {
        bot.sendMessage(chatId, `não consegui escutar o audio 😿`);
      }
    });
  } else {
    bot.sendMessage(
      chatId,
      `👁👄👁 por enquanto só consigo entender audios 🔊 do telegram, então basta me enviar e vou escutar 🦻🏾 e te responder 📨`
    );
  }
});
