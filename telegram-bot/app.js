const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const request = require('request');
const path = require('path');
const fetch = require('node-fetch');
const { Storage } = require('@google-cloud/storage');
const { Firestore } = require('@google-cloud/firestore');

const token = '******';

const storage = new Storage({
   keyFilename: './bot-key.json',
});

const firestore = new Firestore({
   keyFilename: './bot-key.json',
});

const document = firestore.doc('posts/intro-to-firestore');

let bucketName = 'transcriber-bot-294600.appspot.com';

const uploadFile = async (filename) => {
   await storage.bucket(bucketName).upload(filename, {
      gzip: false,
      metadata: {
         cacheControl: 'public, max-age=31536000',
      },
   });
}

const download = (url, path, callback) => {
   request.head(url, (err, res, body) => {
   request(url).pipe(fs.createWriteStream(path)).on('close', callback);
 });
};

const bot = new TelegramBot(token, {
   polling: true
});

bot.on('message', async msg => {
   console.log(msg)
   console.log('==========================')
   const chatId = msg.chat.id;
   if (msg.voice) {
      const audioID = msg.voice.file_id;
      const res = await fetch(
         `https://api.telegram.org/bot${token}/getFile?file_id=${audioID}`
      );

      const res2 = await res.json();
      const filePath = res2.result.file_path;
      const filename = filePath.split('/')[1].split('.')[0]

      const downloadURL = `https://api.telegram.org/file/bot${token}/${filePath}`;
      
      download(downloadURL, path.join(__dirname, `${filename}.ogg`), async () =>{
         console.log('Done!')
         console.log('uploading...')
         await uploadFile(`./${filename}.ogg`)
         console.log('SUCCESS')
         setTimeout(() => {
            let query = firestore.collection('audios').doc(`${filename}.ogg`)
            query.get().then(res => {
               let botResponse = res._fieldsProto.transcription.stringValue;
               bot.sendMessage(chatId, `"${botResponse}"`)
            })
         }, 4000)
      });
   }
});
