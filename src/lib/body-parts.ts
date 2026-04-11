import { BodyPart } from "@prisma/client";

export const BODY_PART_LABELS: Record<BodyPart, string> = {
  KNEE: "膝關節",
  SHOULDER: "肩關節",
  ELBOW: "肘關節",
  WRIST: "腕關節",
  HAND: "手部",
  HIP: "髖關節",
  ANKLE: "踝關節",
  FOOT: "足部",
  CERVICAL_SPINE: "頸椎",
  THORACIC_SPINE: "胸椎",
  LUMBAR_SPINE: "腰椎",
  SACROILIAC: "薦髂關節",
  OTHER: "其他",
};

export const BODY_PART_OPTIONS: Array<{ value: BodyPart; label: string }> = (
  Object.keys(BODY_PART_LABELS) as BodyPart[]
).map((value) => ({
  value,
  label: BODY_PART_LABELS[value],
}));
