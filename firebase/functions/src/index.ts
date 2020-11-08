import * as functions from "firebase-functions";
// Imports the Google Cloud client library
import speech from "@google-cloud/speech";
import { firestore, storage } from "firebase-admin";
// Creates a client
const client = new speech.SpeechClient();

export const bucketHandler = functions.storage
  .object()
  .onFinalize(async (object, context) => {
    if (object.contentType?.includes("audio")) {
      const uri = `gs://${object.bucket}/${object.name}`;
      const result = await convertAudio(uri, "pt-BR");

      await firestore().collection("audios").doc("id").set(result);
      await storage()
        .bucket(object.bucket)
        .file(object.name ?? "").delete;
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
  const config = {
    languageCode: language,
    enableWordTimeOffsets: true,
  };
  const request = {
    audio: audio,
    config: config,
  };

  // Detects speech in the audio file
  try {
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
