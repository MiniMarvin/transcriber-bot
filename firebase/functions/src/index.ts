import * as functions from "firebase-functions";
// Imports the Google Cloud client library
import speech from "@google-cloud/speech";
import * as admin from "firebase-admin";

// setup the default app for the firebase
admin.initializeApp();

// Creates a client
const client = new speech.SpeechClient();

export const bucketHandler = functions.storage
  .object()
  .onFinalize(async (object, context) => {
    if (object.contentType?.includes("audio")) {
      const uri = `gs://${object.bucket}/${object.name}`;
      functions.logger.info(uri);

      // const uri = `${object.selfLink}?alt=media&token=${object?.metadata?.firebaseStorageDownloadTokens}`;
      // const audio = await admin
      //   .storage()
      //   .bucket(object.bucket)
      //   .file(object.name ?? "")
      //   .download();

      const result = await convertAudio(uri, "pt-BR");
      // const rawAudio = audio.map((buffer) => buffer.toString()).join("");
      // functions.logger.info(rawAudio);

      // const result = await convertRawAudio(rawAudio, "pt-BR");
      functions.logger.info(result);

      // try {
      await admin
        .firestore()
        .collection("audios")
        .doc(object.name ?? "")
        .set(result);
      // await admin
      //   .storage()
      //   .bucket(object.bucket)
      //   .file(object.name ?? "")
      //   .delete();
      // } catch (err) {
      //   functions.logger.error(err);
      // }
    }
    functions.logger.info(JSON.stringify(object));
  });

export const helloWorld = functions.https.onRequest(
  async (request, response) => {
    functions.logger.info("Hello logs!", { structuredData: true });
    try {
      const transcription = await quickstart();
      functions.logger.info(transcription);
      response.send(transcription);
    } catch (err) {
      functions.logger.error(err);
      response.send("Erro realizando a busca");
    }
  }
);

async function quickstart(): Promise<any> {
  const result = await convertAudio(
    "gs://cloud-samples-tests/speech/brooklyn.flac",
    "en-US"
  );
  return result.transcription;
}

async function convertAudio(uri: string, language: string): Promise<any> {
  // The audio file's encoding, sample rate in hertz, and BCP-47 language code
  const audio = {
    uri: uri,
  };
  // Duration: 00:04:40.69, start: 0.006500, bitrate: 18 kb/s
  // Stream #0:0: Audio: opus, 48000 Hz, mono, fltp
  const config = <const>{
    enableAutomaticPunctuation: true,
    encoding: "OGG_OPUS",
    sampleRateHertz: 16000,
    languageCode: language || "pt-BR",
    model: "default",
    // sampleRateHertz: 48000,
  };
  const request = {
    audio: audio,
    config: config,
  };

  // Detects speech in the audio file
  try {
    // tslint:disable-next-line
    const [response] = await client.recognize(request);
    const transcription =
      response?.results?.length &&
      response?.results?.length > 0 &&
      response?.results
        ?.map(
          (result) => result?.alternatives && result?.alternatives[0].transcript
        )
        .join("\n");

    return { transcription, results: response?.results };
  } catch (err) {
    return err;
  }
}

// async function convertRawAudio(
//   rawAudio: string,
//   language: string
// ): Promise<any> {
//   // The audio file's encoding, sample rate in hertz, and BCP-47 language code
//   const audio = {
//     content: rawAudio,
//   };
//   // Duration: 00:04:40.69, start: 0.006500, bitrate: 18 kb/s
//   // Stream #0:0: Audio: opus, 48000 Hz, mono, fltp
//   const config = <const>{
//     enableAutomaticPunctuation: true,
//     encoding: "LINEAR16",
//     languageCode: language || "pt-BR",
//     model: "default",
//     sampleRateHertz: 48000,
//   };
//   const request = {
//     audio: audio,
//     config: config,
//   };

//   // Detects speech in the audio file
//   try {
//     // tslint:disable-next-line
//     const [response] = await client.recognize(request);
//     const transcription =
//       response?.results?.length &&
//       response?.results?.length > 0 &&
//       response?.results
//         ?.map(
//           (result) => result?.alternatives && result?.alternatives[0].transcript
//         )
//         .join("\n");

//     return { transcription, results: response?.results };
//   } catch (err) {
//     return err;
//   }
// }
