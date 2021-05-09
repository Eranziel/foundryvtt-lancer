import { TagInstance } from "machine-mind";

export type AccDiffFlag = "ACCURATE" | "INACCURATE" | "SOFT_COVER" | "HARD_COVER" | "SEEKING";
export const AccDiffRegistry: Record<AccDiffFlag, number> = {
  ACCURATE: 1,
  INACCURATE: -1,
  SOFT_COVER: -1,
  HARD_COVER: -2,
  SEEKING: 0,
};

export function calcAccDiff(flags: AccDiffFlag[], manual = 0) {
  let total = 0;

  const isSeeking = flags.includes("SEEKING");
  for (let flag of flags) {
    if (flag === "HARD_COVER" || flag === "SOFT_COVER") {
      total += isSeeking ? 0 : AccDiffRegistry[flag];
    } else {
      total += AccDiffRegistry[flag];
    }
  }
  return total + manual;
}

export function tagsToFlags(tags: TagInstance[]): AccDiffFlag[] {
  const ret: AccDiffFlag[] = [];
  tags.forEach(tag => {
    switch (tag.Tag.LID) {
      case "tg_accurate":
        ret.push("ACCURATE");
      case "tg_inaccurate":
        ret.push("INACCURATE");
      case "tg_seeking":
        ret.push("SEEKING");
    }
  });
  return ret;
}

export function toggleCover(toggle: boolean) {
  const ret = document.querySelectorAll('[data-accdiff="SOFT_COVER"],[data-accdiff="HARD_COVER"]');
  ret.forEach(ele => (toggle ? ele.removeAttribute("disabled") : ele.setAttribute("disabled", "true")));
}
