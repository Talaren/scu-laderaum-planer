export const DEFAULT_BOX_SIZES = [32, 24, 16, 8, 4, 2, 1];

function repeatSlots(capacity, count) {
  return Array.from({ length: count }, () => capacity);
}

function expandSlotGroups(slotGroups) {
  return slotGroups.flatMap(([capacity, count]) => repeatSlots(capacity, count));
}

function createGridPreset({ id, name, group, slotGroups, note = "" }) {
  return {
    id,
    name,
    group,
    slotCapacities: expandSlotGroups(slotGroups),
    note
  };
}

export const SHIP_PRESETS = [
  createGridPreset({
    id: "argo-raft",
    name: "Argo RAFT",
    group: "Argo",
    slotGroups: [[32, 6]],
    note: "Sechs feste 32-SCU-Slots."
  }),
  createGridPreset({
    id: "rsi-zeus-mk-ii-cl",
    name: "RSI Zeus MK II CL",
    group: "RSI",
    slotGroups: [[32, 2], [4, 8], [2, 16]]
  }),
  createGridPreset({
    id: "rsi-aurora-es-ln-lx-mr",
    name: "RSI Aurora ES / LN / LX / MR",
    group: "RSI",
    slotGroups: [[2, 1], [1, 1]]
  }),
  createGridPreset({
    id: "rsi-zeus-mk-ii-es",
    name: "RSI Zeus MK II ES",
    group: "RSI",
    slotGroups: [[16, 2]]
  }),
  createGridPreset({
    id: "rsi-polaris",
    name: "RSI Polaris",
    group: "RSI",
    slotGroups: [[32, 12], [24, 8]]
  }),
  createGridPreset({
    id: "rsi-salvation",
    name: "RSI Salvation",
    group: "RSI",
    slotGroups: [[1, 6]]
  }),
  createGridPreset({
    id: "rsi-aurora-cl-se",
    name: "RSI Aurora CL / SE",
    group: "RSI",
    slotGroups: [[2, 3]]
  }),
  createGridPreset({
    id: "rsi-hermes",
    name: "RSI Hermes",
    group: "RSI",
    slotGroups: [[32, 8], [16, 2]]
  }),
  createGridPreset({
    id: "rsi-apollo",
    name: "RSI Apollo",
    group: "RSI",
    slotGroups: [[2, 16]]
  }),
  createGridPreset({
    id: "rsi-perseus",
    name: "RSI Perseus",
    group: "RSI",
    slotGroups: [[32, 3]]
  }),
  createGridPreset({
    id: "rsi-constellation-phoenix",
    name: "RSI Constellation Phoenix",
    group: "RSI",
    slotGroups: [[32, 2], [2, 8]]
  }),
  createGridPreset({
    id: "rsi-constellation-andromeda-aquila",
    name: "RSI Constellation Andromeda / Aquila",
    group: "RSI",
    slotGroups: [[32, 2], [4, 8]]
  }),
  createGridPreset({
    id: "constellation-taurus",
    name: "RSI Constellation Taurus",
    group: "RSI",
    slotGroups: [[32, 2], [24, 2], [4, 14], [1, 6]]
  }),
  createGridPreset({
    id: "rsi-aurora-mk-ii-cargo-module",
    name: "RSI Aurora MK II w/ Cargo Module",
    group: "RSI",
    slotGroups: [[2, 2], [1, 4]]
  }),
  createGridPreset({
    id: "rsi-aurora-mk-ii",
    name: "RSI Aurora MK II",
    group: "RSI",
    slotGroups: [[1, 2]]
  }),
  createGridPreset({
    id: "drake-corsair",
    name: "Drake Corsair",
    group: "Drake",
    slotGroups: [[32, 2], [2, 4]]
  }),
  createGridPreset({
    id: "drake-vulture",
    name: "Drake Vulture",
    group: "Drake",
    slotGroups: [[8, 1], [2, 2]]
  }),
  createGridPreset({
    id: "cutlass-black",
    name: "Drake Cutlass Black",
    group: "Drake",
    slotGroups: [[16, 2], [2, 6], [1, 2]]
  }),
  createGridPreset({
    id: "drake-golem-ox",
    name: "Drake Golem OX",
    group: "Drake",
    slotGroups: [[32, 2]]
  }),
  createGridPreset({
    id: "drake-cutter",
    name: "Drake Cutter",
    group: "Drake",
    slotGroups: [[1, 4]]
  }),
  createGridPreset({
    id: "drake-clipper",
    name: "Drake Clipper",
    group: "Drake",
    slotGroups: [[2, 6]]
  }),
  createGridPreset({
    id: "drake-cutter-scout-rambler",
    name: "Drake Cutter Scout / Rambler",
    group: "Drake",
    slotGroups: [[1, 2]]
  }),
  createGridPreset({
    id: "drake-cutlass-blue-red",
    name: "Drake Cutlass Blue / Red",
    group: "Drake",
    slotGroups: [[2, 4], [1, 4]]
  }),
  createGridPreset({
    id: "drake-mule",
    name: "Drake Mule",
    group: "Drake",
    slotGroups: [[1, 1]]
  }),
  createGridPreset({
    id: "drake-caterpillar",
    name: "Drake Caterpillar",
    group: "Drake",
    slotGroups: [[24, 18], [4, 4], [2, 56], [1, 16]],
    note: "PDF-Grid laut Autoload. Beim manuellen Laden ist die Frontsektion derzeit fehlerhaft; 24-SCU-Kisten passen dort nicht sauber bis nach hinten."
  }),
  createGridPreset({
    id: "crusader-m2-hercules-starlifter",
    name: "Crusader M2 Hercules Starlifter",
    group: "Crusader",
    slotGroups: [[32, 10], [4, 40], [2, 21]]
  }),
  createGridPreset({
    id: "crusader-a2-hercules-starlifter",
    name: "Crusader A2 Hercules Starlifter",
    group: "Crusader",
    slotGroups: [[32, 6], [4, 1]]
  }),
  createGridPreset({
    id: "crusader-c2-hercules-starlifter",
    name: "Crusader C2 Hercules Starlifter",
    group: "Crusader",
    slotGroups: [[32, 20], [2, 28]]
  }),
  createGridPreset({
    id: "crusader-intrepid",
    name: "Crusader Intrepid",
    group: "Crusader",
    slotGroups: [[2, 4]]
  }),
  createGridPreset({
    id: "crusader-mercury-star-runner",
    name: "Crusader Mercury Star Runner",
    group: "Crusader",
    slotGroups: [[24, 3], [4, 9], [2, 2], [1, 2]]
  }),
  createGridPreset({
    id: "c1-spirit",
    name: "Crusader C1 Spirit",
    group: "Crusader",
    slotGroups: [[32, 2]]
  }),
  createGridPreset({
    id: "aegis-avenger-titan",
    name: "Aegis Avenger Titan",
    group: "Aegis",
    slotGroups: [[4, 2]]
  }),
  createGridPreset({
    id: "aegis-reclaimer",
    name: "Aegis Reclaimer",
    group: "Aegis",
    slotGroups: [[16, 10], [8, 8], [4, 8], [2, 72], [1, 20]]
  }),
  createGridPreset({
    id: "aegis-hammerhead",
    name: "Aegis Hammerhead",
    group: "Aegis",
    slotGroups: [[16, 2], [2, 4]]
  }),
  createGridPreset({
    id: "aegis-idris-p",
    name: "Aegis Idris-P",
    group: "Aegis",
    slotGroups: [[16, 80], [2, 46], [1, 2]]
  }),
  createGridPreset({
    id: "aegis-retaliator",
    name: "Aegis Retaliator",
    group: "Aegis",
    slotGroups: [[24, 1], [16, 1], [2, 16], [1, 2]]
  }),
  createGridPreset({
    id: "aegis-redeemer",
    name: "Aegis Redeemer",
    group: "Aegis",
    slotGroups: [[1, 2]]
  }),
  createGridPreset({
    id: "anvil-carrack",
    name: "Anvil Carrack",
    group: "Anvil",
    slotGroups: [[16, 24], [8, 6], [2, 12]]
  }),
  createGridPreset({
    id: "anvil-pisces-c8-c8x",
    name: "Anvil Pisces C8 / C8X",
    group: "Anvil",
    slotGroups: [[2, 2]]
  }),
  createGridPreset({
    id: "anvil-paladin",
    name: "Anvil Paladin",
    group: "Anvil",
    slotGroups: [[2, 2]]
  }),
  createGridPreset({
    id: "anvil-hornet-f7c-mkii",
    name: "Anvil Hornet F7C MKII",
    group: "Anvil",
    slotGroups: [[1, 2]]
  }),
  createGridPreset({
    id: "anvil-asgard",
    name: "Anvil Asgard",
    group: "Anvil",
    slotGroups: [[32, 4], [2, 24], [1, 4]]
  }),
  createGridPreset({
    id: "anvil-valkyrie",
    name: "Anvil Valkyrie",
    group: "Anvil",
    slotGroups: [[24, 2], [4, 6], [2, 9]]
  }),
  createGridPreset({
    id: "misc-starfarer",
    name: "MISC Starfarer",
    group: "MISC",
    slotGroups: [[24, 6], [16, 2], [4, 10], [2, 35], [1, 5]]
  }),
  createGridPreset({
    id: "misc-freelancer",
    name: "MISC Freelancer",
    group: "MISC",
    slotGroups: [[32, 1], [4, 4], [2, 9]]
  }),
  createGridPreset({
    id: "freelancer-max",
    name: "MISC Freelancer MAX",
    group: "MISC",
    slotGroups: [[32, 2], [4, 8], [2, 12]]
  }),
  createGridPreset({
    id: "misc-freelancer-mis-dur",
    name: "MISC Freelancer MIS / DUR",
    group: "MISC",
    slotGroups: [[16, 1], [4, 2], [2, 6]]
  }),
  createGridPreset({
    id: "hull-a",
    name: "MISC Hull A",
    group: "MISC",
    slotGroups: [[16, 4]]
  }),
  createGridPreset({
    id: "misc-hull-c",
    name: "MISC Hull C",
    group: "MISC",
    slotGroups: [[32, 144]]
  }),
  createGridPreset({
    id: "misc-reliant-tana",
    name: "MISC Reliant Tana",
    group: "MISC",
    slotGroups: [[1, 1]]
  }),
  createGridPreset({
    id: "misc-reliant-kore",
    name: "MISC Reliant Kore",
    group: "MISC",
    slotGroups: [[2, 2], [1, 2]]
  }),
  createGridPreset({
    id: "misc-fortune",
    name: "MISC Fortune",
    group: "MISC",
    slotGroups: [[4, 1], [1, 12]]
  }),
  createGridPreset({
    id: "misc-starlancer-max",
    name: "MISC Starlancer MAX",
    group: "MISC",
    slotGroups: [[32, 6], [4, 8]]
  }),
  createGridPreset({
    id: "misc-starlancer-tac",
    name: "MISC Starlancer TAC",
    group: "MISC",
    slotGroups: [[32, 2], [4, 8]]
  }),
  createGridPreset({
    id: "origin-135c",
    name: "Origin 135c",
    group: "Origin",
    slotGroups: [[2, 3]]
  }),
  createGridPreset({
    id: "origin-100i-125a",
    name: "Origin 100i / 125a",
    group: "Origin",
    slotGroups: [[2, 1]]
  }),
  createGridPreset({
    id: "origin-400i",
    name: "Origin 400i",
    group: "Origin",
    slotGroups: [[24, 1], [2, 8], [1, 2]]
  }),
  createGridPreset({
    id: "origin-600i-touring",
    name: "Origin 600i Touring",
    group: "Origin",
    slotGroups: [[2, 8], [1, 4]]
  }),
  createGridPreset({
    id: "origin-600i-explorer",
    name: "Origin 600i Explorer",
    group: "Origin",
    slotGroups: [[2, 20], [1, 4]],
    note: "Korrigierte PDF-Angabe: 20x 2 SCU plus 4x 1 SCU ergeben 44 SCU."
  }),
  createGridPreset({
    id: "origin-890-jump",
    name: "Origin 890 Jump",
    group: "Origin",
    slotGroups: [[32, 6], [24, 4], [16, 2], [2, 28], [1, 12]]
  }),
  createGridPreset({
    id: "origin-325a-350r",
    name: "Origin 325a / 350r",
    group: "Origin",
    slotGroups: [[4, 1]]
  }),
  createGridPreset({
    id: "origin-315p",
    name: "Origin 315p",
    group: "Origin",
    slotGroups: [[4, 3]]
  }),
  createGridPreset({
    id: "origin-300i",
    name: "Origin 300i",
    group: "Origin",
    slotGroups: [[4, 2]]
  }),
  createGridPreset({
    id: "argo-mpuv-c",
    name: "Argo Astronautics MPUV-C",
    group: "Argo",
    slotGroups: [[2, 1]]
  }),
  createGridPreset({
    id: "argo-mpuv-t",
    name: "Argo Astronautics MPUV-T",
    group: "Argo",
    slotGroups: [[16, 1]]
  }),
  createGridPreset({
    id: "argo-csv-sm",
    name: "Argo Astronautics CSV-SM",
    group: "Argo",
    slotGroups: [[4, 1]]
  }),
  createGridPreset({
    id: "argo-srv",
    name: "Argo Astronautics SRV",
    group: "Argo",
    slotGroups: [[4, 2], [2, 2]]
  }),
  createGridPreset({
    id: "argo-mole",
    name: "Argo Astronautics MOLE",
    group: "Argo",
    slotGroups: [[16, 2]]
  }),
  createGridPreset({
    id: "argo-moth",
    name: "Argo Astronautics MOTH",
    group: "Argo",
    slotGroups: [[24, 8], [16, 2]]
  }),
  createGridPreset({
    id: "esperia-prowler-utility",
    name: "Esperia Prowler Utility",
    group: "Sonstige",
    slotGroups: [[16, 2]],
    note: "Korrigierte PDF-Angabe: 2x 16 SCU ergeben 32 SCU."
  }),
  createGridPreset({
    id: "tumbril-cyclone",
    name: "Tumbril Cyclone",
    group: "Sonstige",
    slotGroups: [[1, 1]]
  }),
  createGridPreset({
    id: "consolidated-outland-nomad",
    name: "Consolidated Outland Nomad",
    group: "Sonstige",
    slotGroups: [[16, 1], [2, 4]]
  }),
  createGridPreset({
    id: "consolidated-outland-mustang-alpha",
    name: "Consolidated Outland Mustang Alpha",
    group: "Sonstige",
    slotGroups: [[2, 2]]
  }),
  createGridPreset({
    id: "shiv",
    name: "Shiv",
    group: "Sonstige",
    slotGroups: [[32, 1]]
  }),
  createGridPreset({
    id: "syulen",
    name: "Syulen",
    group: "Sonstige",
    slotGroups: [[1, 6]]
  })
];

export function getShipPresetById(presetId) {
  return SHIP_PRESETS.find((preset) => preset.id === presetId) ?? SHIP_PRESETS[0];
}
