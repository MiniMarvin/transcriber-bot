const { Firestore } = require('@google-cloud/firestore');

const firestore = new Firestore({
    keyFilename: './bot-key.json',
});

let query = firestore.collection('audios').doc('file_20.ogg');

query.get().then( res => {
    console.log(res._fieldsProto.transcription.stringValue)
}) 