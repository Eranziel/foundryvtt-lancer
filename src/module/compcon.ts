import { PackedPilotData } from "machine-mind";
import Auth from "@aws-amplify/auth";
import Storage from "@aws-amplify/storage";
import { CachedCloudPilot } from "./interfaces";

// we only cache the id, cloud ids, and name; we're going to fetch all other data on user input
// the point of the cache is not have the pilot actor window to wait for network calls
// this does mean that the GM needs to refresh foundry to clear this cache if they add pilots
// (they could also re-login, we initiate a cache refresh there)

let _cache: CachedCloudPilot[] = [];

export function cleanCloudOwnerID(str: string): string {
  return str.substring(0, 10) == 'us-east-1:' ? str.substring(10) : str
}

export async function populatePilotCache(): Promise<CachedCloudPilot[]> {
  await Auth.currentSession(); // refresh the token if we need to
  const res = await Storage.list("pilot", { level: "protected" });
  const data: Array<PackedPilotData> =
    await Promise.all(res.map((obj: { key: string }) => fetchPilot(obj.key)));
  data.forEach(pilot => {
    pilot.mechs = [];
    pilot.cloudOwnerID = cleanCloudOwnerID(pilot.cloudOwnerID);
  });
  _cache = data;
  return data;
}

export function pilotCache(): CachedCloudPilot[] {
  return _cache;
}

export async function fetchPilot(cloudID: string, cloudOwnerID?: string): Promise<PackedPilotData> {
  // we're just gonna. accept all possible forms of this. let's not fuss.
  if (!cloudOwnerID && cloudID.includes("//")) { // only one argument, new-style vault id
    [cloudOwnerID, cloudID] = cloudID.split("//");
  }
  if (cloudID.substring(0, 6) != "pilot/") {
    cloudID = "pilot/" + cloudID;
  }
  if (cloudOwnerID && cloudOwnerID.substring(0, 10) != "us-east-1:") {
    cloudOwnerID = "us-east-1:" + cloudOwnerID;
  }
  try {
    await Auth.currentSession(); // refresh the token if we need to
  } catch (e) {
    ui.notifications!.error("Sync failed - you aren't logged into a Comp/Con account.");
    throw e;
  }
  const req: any = {
    level: "protected",
    download: true
  };
  if (cloudOwnerID) { req.identityId = cloudOwnerID; }
  const res = (await Storage.get(cloudID, req)) as any;
  const text = await res.Body.text();
  return JSON.parse(text);
}
