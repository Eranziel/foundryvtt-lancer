import type { CachedCloudPilot } from "../interfaces";
import { PackedPilotData } from "./unpacking/packed-types";

// we only cache the id, cloud ids, and name; we're going to fetch all other data on user input
// the point of the cache is not have the pilot actor window to wait for network calls
// this does mean that the GM needs to refresh foundry to clear this cache if they add pilots
// (they could also re-login, we initiate a cache refresh there)

let _cache: CachedCloudPilot[] = [];

export function cleanCloudOwnerID(str: string): string {
  return str.substring(0, 10) == "us-east-1:" ? str.substring(10) : str;
}

export async function populatePilotCache(): Promise<CachedCloudPilot[]> {
  const { fetchAuthSession } = await import("@aws-amplify/auth");
  const { list } = await import("@aws-amplify/storage");
  try {
    await fetchAuthSession(); // refresh the token if we need to
  } catch (e) {
    console.warn(`AWS Auth failed: ${e}`);
    return [];
  }
  const res = await list({
    prefix: "pilot/",
    options: {
      accessLevel: "protected",
    },
  });

  const data = (await Promise.all(res.items.map(obj => (obj.key ? fetchPilot(obj.key) : null)))).map(
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

export async function fetchPilotViaShareCode(sharecode: string): Promise<PackedPilotData> {
  const shareCodeResponse = await fetch("https://api.compcon.app/share?code=" + sharecode, {
    headers: {
      "x-api-key": "fcFvjjrnQy2hypelJQi4X9dRI55r5KuI4bC07Maf",
    },
  });

  const shareObj = await shareCodeResponse.json();
  const pilotResponse = await fetch(shareObj["presigned"]);
  return await pilotResponse.json();
}

export async function fetchPilotViaCache(cachedPilot: CachedCloudPilot): Promise<PackedPilotData> {
  const sanitizedName = cachedPilot.name.replace(/[^a-zA-Z\d\s:]/g, " ");
  const documentID = `pilot/${sanitizedName}--${cachedPilot.id}--active`;
  const { downloadData } = await import("@aws-amplify/storage");

  const res = await downloadData({ key: documentID, options: { accessLevel: "protected" } }).result;

  const text = await res.body.text();
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
    const { fetchAuthSession } = await import("@aws-amplify/auth");
    await fetchAuthSession(); // refresh the token if we need to
  } catch (e) {
    ui.notifications!.error("Sync failed - you aren't logged into a Comp/Con account.");
    throw e;
  }

  const { downloadData } = await import("@aws-amplify/storage");
  const opts: any = {
    accessLevel: "protected",
  };
  if (cloudOwnerID) {
    opts.targetIdentityId = cloudOwnerID;
  }
  const res = await downloadData({ key: cloudID, options: opts }).result;
  const text = await res.body.text();
  return JSON.parse(text);
}
