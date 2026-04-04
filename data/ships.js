export const DEFAULT_BOX_SIZES = [32, 24, 16, 8, 4, 2, 1];

export const SHIP_PRESETS = [
  {
    id: "raft-classic",
    name: "ARGO RAFT (3x32)",
    slotCapacities: [32, 32, 32],
    maxBoxesPerSlot: 1,
    cargoModel: "Feste Containerhalterung",
    note: "Klassische RAFT-Konfiguration mit drei externen Containern. Gut fuer volle 32er, aber Restmengen werden schnell unhandlich."
  },
  {
    id: "raft-expanded",
    name: "ARGO RAFT (6x32)",
    slotCapacities: [32, 32, 32, 32, 32, 32],
    maxBoxesPerSlot: 1,
    cargoModel: "Erweiterte Containerhalterung",
    note: "Alternative Vorlage fuer Patches oder Loadouts, in denen die RAFT mehr als drei 32er Container aufnehmen soll."
  },
  {
    id: "cutlass-black",
    name: "Drake Cutlass Black",
    slotCapacities: [46],
    maxBoxesPerSlot: null,
    cargoModel: "Flexibles Frachtnetz",
    note: "Kleiner Hauler fuer gemischte Missionen und variable Boxenkombinationen."
  },
  {
    id: "hull-a",
    name: "MISC Hull A",
    slotCapacities: [64],
    maxBoxesPerSlot: null,
    cargoModel: "Flexibles Frachtnetz",
    note: "Praktisch fuer kleinere Frachtrouten mit klarer Trennung von Quelle und Ziel."
  },
  {
    id: "c1-spirit",
    name: "Crusader C1 Spirit",
    slotCapacities: [64],
    maxBoxesPerSlot: null,
    cargoModel: "Flexibles Frachtnetz",
    note: "Solider Allrounder mit genug Platz fuer haeufige Liefermissionen."
  },
  {
    id: "freelancer-max",
    name: "MISC Freelancer MAX",
    slotCapacities: [120],
    maxBoxesPerSlot: null,
    cargoModel: "Flexibles Frachtnetz",
    note: "Mittlere bis groessere Frachten lassen sich in einem einzelnen Laderaum effizient aufteilen."
  },
  {
    id: "constellation-taurus",
    name: "RSI Constellation Taurus",
    slotCapacities: [174],
    maxBoxesPerSlot: null,
    cargoModel: "Flexibles Frachtnetz",
    note: "Viel Raum fuer grosse Mengen und dadurch oft weniger Umlaeufe."
  }
];

export function getShipPresetById(presetId) {
  return SHIP_PRESETS.find((preset) => preset.id === presetId) ?? SHIP_PRESETS[0];
}
