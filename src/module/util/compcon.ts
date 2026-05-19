import type { PackedPilotData } from "./unpacking/packed-types";

const CC_API_KEY = "fcFvjjrnQy2hypelJQi4X9dRI55r5KuI4bC07Maf";
const CC_API_URI = "https://api.compcon.app";
const CC_BUCKET_URI = "https://ds69h3g1zxwgy.cloudfront.net";

export async function fetchV2PilotViaShareCode(sharecode: string): Promise<PackedPilotData> {
  const shareCodeResponse = await fetch(`${CC_API_URI}/share?code=${sharecode}`, {
    headers: {
      "x-api-key": CC_API_KEY,
    },
  });

  const shareObj = await shareCodeResponse.json();
  const pilotResponse = await fetch(shareObj["presigned"]);
  return await pilotResponse.json();
}

/**
 * Fetches multiple pilot share codes from CCv3 at once.
 * @param sharecodes
 */
export async function fetchV3PilotViaShareCodes(sharecodes: string[]): Promise<PackedPilotData[]> {
  const shareCodeResponse = await fetch(`${CC_API_URI}/v3/code?codes=${JSON.stringify(sharecodes)}&scope=items`, {
    headers: {
      "x-api-key": CC_API_KEY,
    },
  });

  const sourceObjs: { uri: string }[] = await shareCodeResponse.json();
  const sources = sourceObjs.map(o => o.uri);

  return Promise.all(sources.map(source => fetch(`${CC_BUCKET_URI}/${source}`).then(res => res.json())));
}

/**
 * Wrapper for `fetchV3PilotViaShareCodes`
 * @param sharecode
 */
export async function fetchV3PilotViaShareCode(sharecode: string): Promise<PackedPilotData> {
  return (await fetchV3PilotViaShareCodes([sharecode]))[0];
}
