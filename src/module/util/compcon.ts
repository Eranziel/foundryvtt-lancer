import type { CachedCloudPilot } from "../interfaces";
import type { PackedPilotData } from "./unpacking/packed-types";

// we only cache the id, cloud ids, and name; we're going to fetch all other data on user input
// the point of the cache is not have the pilot actor window to wait for network calls
// this does mean that the GM needs to refresh foundry to clear this cache if they add pilots
// (they could also re-login, we initiate a cache refresh there)

let _cache: CachedCloudPilot[] = [];
const CC_API_KEY = "fcFvjjrnQy2hypelJQi4X9dRI55r5KuI4bC07Maf";
const CC_API_URI = "https://api.compcon.app";
const CC_BUCKET_URI = "https://ds69h3g1zxwgy.cloudfront.net";

export function cleanCloudOwnerID(str: string): string {
  return str.substring(0, 10) == "us-east-1:" ? str.substring(10) : str;
}

export async function populatePilotCache(): Promise<CachedCloudPilot[]> {
  const { Auth } = await import("@aws-amplify/auth");
  const { Storage } = await import("@aws-amplify/storage");
  try {
    await Auth.currentSession(); // refresh the token if we need to
  } catch (e) {
    console.warn(`AWS Auth failed: ${e}`);
    return [];
  }
  const res = await Storage.list("pilot", {
    level: "protected",
    cacheControl: "no-cache",
    // Filter out deleted pilots (tagged with "delete" or "s3-remove-flag"), we want "active"
  }).then(result => {
    return result.results.filter(x => x.key?.endsWith("--active"));
  });

  const data = (await Promise.all(res.map(obj => (obj.key ? fetchPilot(obj.key) : null)))).map(
    x => x
  ) as Array<PackedPilotData>;
  data.forEach(pilot => {
    pilot.mechs = [];
    pilot.cloudOwnerID = pilot.cloudOwnerID != null ? cleanCloudOwnerID(pilot.cloudOwnerID) : ""; // only clean the CloudOwnerID if its available
    pilot.cloudID = pilot.cloudID != null ? pilot.cloudID : pilot.id; // if cloudID is present in the data being returned, use it. Otherwise, use the ID for selection purposes
  });
  _cache = data;
  return data;
}

export function pilotCache(): CachedCloudPilot[] {
  return _cache;
}

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

export async function fetchPilotViaCache(cachedPilot: CachedCloudPilot): Promise<PackedPilotData> {
  const sanitizedName = cachedPilot.name.replace(/[^a-zA-Z\d\s:]/g, " ");
  const documentID = `pilot/${sanitizedName}--${cachedPilot.id}--active`;
  const { Storage } = await import("@aws-amplify/storage");
  const req: any = {
    level: "protected",
    download: true,
    cacheControl: "no-cache",
  };

  const res = (await Storage.get(documentID, req)) as any;
  const text = await res.Body.text();
  const json = JSON.parse(text);
  return json;
}

export async function fetchPilot(cloudID: string, cloudOwnerID?: string): Promise<PackedPilotData> {
  // we're just gonna. accept all possible forms of this. let's not fuss.
  if (!cloudOwnerID && cloudID.includes("//")) {
    // only one argument, new-style vault id
    [cloudOwnerID, cloudID] = cloudID.split("//");
  }
  if (cloudID.substring(0, 6) != "pilot/") {
    cloudID = "pilot/" + cloudID;
  }
  if (cloudOwnerID && cloudOwnerID.substring(0, 10) != "us-east-1:") {
    cloudOwnerID = "us-east-1:" + cloudOwnerID;
  }
  try {
    const { Auth } = await import("@aws-amplify/auth");
    await Auth.currentSession(); // refresh the token if we need to
  } catch (e) {
    ui.notifications!.error("Sync failed - you aren't logged into a Comp/Con account.");
    throw e;
  }

  const { Storage } = await import("@aws-amplify/storage");
  const req: any = {
    level: "protected",
    download: true,
    cacheControl: "no-cache",
  };
  if (cloudOwnerID) {
    req.identityId = cloudOwnerID;
  }
  const res = (await Storage.get(cloudID, req)) as any;
  const text = await res.Body.text();
  return JSON.parse(text);
}
