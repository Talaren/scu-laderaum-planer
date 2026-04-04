import test from "node:test";
import assert from "node:assert/strict";

import { applyFlightDelivery, buildFlightPlans, describeSlotCapacities, planMission, planMissionManifest, sumValues } from "../lib/planner.js";
import { buildShareUrl, readShareStateFromUrl } from "../lib/share-state.js";
import { SHIP_PRESETS, getShipPresetById } from "../data/ships.js";

test("3x32-Slots liefern 93 SCU exakt in einem Flug", () => {
  const ship = {
    name: "3x32",
    slotCapacities: [32, 32, 32]
  };

  const plan = planMission({
    ship,
    boxSizes: [32, 24, 16, 8, 4, 2, 1],
    targetSCU: 93,
    mode: "exact"
  });

  assert.equal(plan.reachable, true);
  assert.equal(plan.flightsRequired, 1);
  assert.equal(plan.deliveredSCU, 93);
  assert.deepEqual(plan.flights.map((flight) => flight.total), [93]);
  assert.deepEqual(plan.flights[0].boxes, [32, 32, 24, 4, 1]);
});

test("3x32-Slots erreichen 93 SCU auch im Mindestmodus ohne Ueberlieferung", () => {
  const ship = {
    name: "3x32",
    slotCapacities: [32, 32, 32]
  };

  const plan = planMission({
    ship,
    boxSizes: [32, 24, 16, 8, 4, 2, 1],
    targetSCU: 93,
    mode: "atLeast"
  });

  assert.equal(plan.reachable, true);
  assert.equal(plan.flightsRequired, 1);
  assert.equal(plan.deliveredSCU, 93);
  assert.equal(plan.overfillSCU, 0);
});

test("Ein einzelner 96-SCU-Slot kann 93 SCU in einem Flug exakt laden", () => {
  const ship = {
    name: "96-Slot",
    slotCapacities: [96]
  };

  const plan = planMission({
    ship,
    boxSizes: [32, 24, 16, 8, 4, 2, 1],
    targetSCU: 93,
    mode: "exact"
  });

  assert.equal(plan.reachable, true);
  assert.equal(plan.flightsRequired, 1);
  assert.equal(plan.deliveredSCU, 93);
  assert.deepEqual(plan.flights[0].boxes, [32, 32, 24, 4, 1]);
});

test("ohne 1-SCU-Kiste ist 93 SCU exakt nicht erreichbar", () => {
  const ship = {
    name: "96-Slot",
    slotCapacities: [96]
  };

  const plan = planMission({
    ship,
    boxSizes: [32, 24, 16, 8, 4, 2],
    targetSCU: 93,
    mode: "exact"
  });

  assert.equal(plan.reachable, false);
});

test("Flight plans respektieren feste SCU-Slots", () => {
  const plans = buildFlightPlans(
    {
      name: "3x32",
      slotCapacities: [32, 32, 32]
    },
    [32, 24, 16, 8, 4, 2, 1]
  );

  const plan93 = plans.get(93);
  assert.equal(plan93.total, 93);
  assert.deepEqual(plan93.boxes, [32, 32, 24, 4, 1]);

  const plan96 = plans.get(96);
  assert.equal(plan96.total, 96);
  assert.equal(plan96.boxCount, 3);

  const plan97 = plans.get(97);
  assert.equal(plan97, undefined);
});

test("RAFT 6x32 kann feste Missionskisten ueber mehrere Ziele kombinieren", () => {
  const manifest = planMissionManifest({
    ship: {
      name: "Argo RAFT",
      slotCapacities: [32, 32, 32, 32, 32, 32]
    },
    boxSizes: [16, 8, 4, 2, 1],
    missions: [
      { label: "Everus Harbor", destination: "Everus Harbor", totalSCU: 124 },
      { label: "Seraphim", destination: "Seraphim Station", totalSCU: 93 },
      { label: "Baijini", destination: "Baijini Point", totalSCU: 84 }
    ]
  });

  assert.equal(manifest.reachable, true);
  assert.equal(manifest.flightsRequired, 2);
  assert.deepEqual(manifest.flights.map((flight) => flight.total), [177, 124]);
  assert.deepEqual(manifest.flights[0].missions.map((mission) => mission.destination), ["Seraphim Station", "Baijini Point"]);
  assert.deepEqual(manifest.flights[1].missions.map((mission) => mission.destination), ["Everus Harbor"]);
  assert.deepEqual(manifest.aggregateBoxes, [
    { size: 16, count: 17 },
    { size: 8, count: 2 },
    { size: 4, count: 3 },
    { size: 1, count: 1 }
  ]);
});

test("Manifest ignoriert bereits abgeschlossene Missionen", () => {
  const manifest = planMissionManifest({
    ship: {
      name: "Argo RAFT",
      slotCapacities: [32, 32, 32, 32, 32, 32]
    },
    boxSizes: [16, 8, 4, 2, 1],
    missions: [
      { label: "Everus Harbor", destination: "Everus Harbor", totalSCU: 124 },
      { label: "Seraphim", destination: "Seraphim Station", totalSCU: 93 },
      { label: "Baijini", destination: "Baijini Point", totalSCU: 84, deliveredSCU: 84 }
    ]
  });

  assert.equal(manifest.reachable, true);
  assert.equal(manifest.flightsRequired, 2);
  assert.deepEqual(manifest.flights.map((flight) => flight.total), [124, 93]);
});

test("Einzelauftrag darf ueber viele Fluege verteilt werden", () => {
  const manifest = planMissionManifest({
    ship: {
      name: "Argo RAFT",
      slotCapacities: [32, 32, 32, 32, 32, 32]
    },
    boxSizes: [16, 8, 4, 2, 1],
    missions: [
      { label: "Everus Harbor", cargo: "Processed Food", destination: "Everus Harbor", totalSCU: 1723 }
    ]
  });

  assert.equal(manifest.reachable, true);
  assert.equal(manifest.flightsRequired, 9);
  assert.deepEqual(manifest.flights.map((flight) => flight.total), [192, 192, 192, 192, 192, 192, 192, 192, 187]);
  assert.ok(manifest.flights.every((flight) => flight.missions.length === 1));
  assert.ok(manifest.flights.every((flight) => flight.missions[0].cargo === "Processed Food"));
});

test("Gelieferter Ladeflug traegt die Mengen in die passenden Missionen ein", () => {
  const updated = applyFlightDelivery(
    [
      { id: "mission-a", cargo: "Quartz", destination: "Seraphim", totalSCU: 93, deliveredSCU: 0 },
      { id: "mission-b", cargo: "Quartz", destination: "Baijini", totalSCU: 84, deliveredSCU: 12 }
    ],
    [
      { id: "mission-a", remainingSCU: 93 },
      { id: "mission-b", remainingSCU: 72 }
    ]
  );

  assert.equal(updated[0].deliveredSCU, 93);
  assert.equal(updated[0].remainingSCU, 0);
  assert.equal(updated[1].deliveredSCU, 84);
  assert.equal(updated[1].remainingSCU, 0);
});

test("Gelieferter Teilflug eines Grossauftrags addiert nur dessen Anteil", () => {
  const updated = applyFlightDelivery(
    [
      { id: "mission-food", cargo: "Processed Food", destination: "Everus Harbor", totalSCU: 1723, deliveredSCU: 384 }
    ],
    [
      { id: "mission-food", remainingSCU: 192 }
    ]
  );

  assert.equal(updated[0].deliveredSCU, 576);
  assert.equal(updated[0].remainingSCU, 1147);
});

test("Gemischte Fracht bleibt pro Auftrag erhalten, auch bei geteiltem Ziel", () => {
  const manifest = planMissionManifest({
    ship: {
      name: "Argo RAFT",
      slotCapacities: [32, 32, 32, 32, 32, 32]
    },
    boxSizes: [16, 8, 4, 2, 1],
    missions: [
      { label: "Melodic Fields", cargo: "Hydrogen Fuel", destination: "Melodic Fields", totalSCU: 60 },
      { label: "High Course", cargo: "Quantum Fuel", destination: "High Course", totalSCU: 136 },
      { label: "Thundering Express 1", cargo: "Hydrogen Fuel", destination: "Thundering Express", totalSCU: 70 },
      { label: "Thundering Express 2", cargo: "Ship Ammunition", destination: "Thundering Express", totalSCU: 67 }
    ]
  });

  assert.equal(manifest.reachable, true);
  assert.equal(manifest.flightsRequired, 3);
  assert.deepEqual(manifest.flights.map((flight) => flight.total), [137, 136, 60]);
  assert.deepEqual(manifest.flights[0].missions.map((mission) => mission.destination), ["Thundering Express", "Thundering Express"]);
  assert.deepEqual(manifest.flights[0].missions.map((mission) => mission.cargo), ["Hydrogen Fuel", "Ship Ammunition"]);
  assert.deepEqual(manifest.flights[0].missions.map((mission) => mission.boxes), [
    [16, 16, 16, 16, 4, 2],
    [16, 16, 16, 16, 2, 1]
  ]);
});

test("Datenmodell enthaelt genau eine RAFT", () => {
  const raftPresets = SHIP_PRESETS.filter((preset) => preset.name.includes("RAFT"));
  assert.equal(raftPresets.length, 1);
  assert.ok(raftPresets.every((preset) => preset.group === "Argo"));
  assert.equal(raftPresets[0].name, "Argo RAFT");
  assert.equal(getShipPresetById("argo-raft").name, "Argo RAFT");
});

test("Grid-Presets enthalten korrigierte PDF-Daten fuer 600i Explorer und Prowler Utility", () => {
  const explorer = SHIP_PRESETS.find((preset) => preset.id === "origin-600i-explorer");
  const prowler = SHIP_PRESETS.find((preset) => preset.id === "esperia-prowler-utility");

  assert.ok(explorer);
  assert.equal(sumValues(explorer.slotCapacities), 44);
  assert.equal(explorer.slotCapacities.filter((capacity) => capacity === 2).length, 20);
  assert.equal(explorer.slotCapacities.filter((capacity) => capacity === 1).length, 4);

  assert.ok(prowler);
  assert.equal(sumValues(prowler.slotCapacities), 32);
  assert.deepEqual(prowler.slotCapacities, [16, 16]);
});

test("Kompakte Slot-Beschreibung fasst identische Grid-Slots zusammen", () => {
  const taurus = SHIP_PRESETS.find((preset) => preset.id === "constellation-taurus");
  const hullC = SHIP_PRESETS.find((preset) => preset.id === "misc-hull-c");

  assert.ok(taurus);
  assert.equal(describeSlotCapacities(taurus.slotCapacities), "2x 32 SCU, 2x 24 SCU, 14x 4 SCU, 6x 1 SCU");

  assert.ok(hullC);
  assert.equal(sumValues(hullC.slotCapacities), 4608);
  assert.equal(describeSlotCapacities(hullC.slotCapacities), "144x 32 SCU");
});

test("Aufzuglimit filtert zu grosse Kisten aus der Berechnung", () => {
  const manifest = planMissionManifest({
    ship: {
      name: "Argo RAFT",
      slotCapacities: [32, 32, 32, 32, 32, 32]
    },
    boxSizes: [32, 24, 16, 8, 4, 2, 1],
    maxBoxSize: 16,
    missions: [
      { label: "Everus Harbor", destination: "Everus Harbor", totalSCU: 124 },
      { label: "Seraphim", destination: "Seraphim Station", totalSCU: 93 },
      { label: "Baijini", destination: "Baijini Point", totalSCU: 84 }
    ]
  });

  assert.equal(manifest.reachable, true);
  assert.deepEqual(manifest.boxSizes, [16, 8, 4, 2, 1]);
  assert.equal(manifest.maxBoxSize, 16);
  assert.deepEqual(manifest.flights.map((flight) => flight.total), [177, 124]);
  assert.ok(manifest.flights.every((flight) => flight.boxes.every((size) => size <= 16)));
});

test("Zu kleines Schiff blockiert Auftraege mit groesserer Aufzugkiste", () => {
  const manifest = planMissionManifest({
    ship: {
      name: "Aegis Avenger Titan",
      slotCapacities: [4, 4]
    },
    boxSizes: [32, 24, 16, 8, 4, 2, 1],
    maxBoxSize: 16,
    missions: [
      { label: "Port Tressler", destination: "Port Tressler", totalSCU: 16 }
    ]
  });

  assert.equal(manifest.reachable, false);
  assert.equal(manifest.reason, "max-box-size-too-large");
  assert.deepEqual(manifest.boxSizes, [16, 8, 4, 2, 1]);
  assert.equal(manifest.maxLoadableContainerSize, 4);
  assert.deepEqual(manifest.blockingMissions.map((mission) => mission.destination), ["Port Tressler"]);
});

test("Hull C plant einen einzelnen 1723-SCU-Auftrag direkt in einem Flug", () => {
  const manifest = planMissionManifest({
    ship: {
      name: "MISC Hull C",
      slotCapacities: Array.from({ length: 144 }, () => 32)
    },
    boxSizes: [16, 8, 4, 2, 1],
    maxBoxSize: 16,
    missions: [
      { label: "Everus Harbor", destination: "Everus Harbor", cargo: "Processed Food", totalSCU: 1723 }
    ]
  });

  assert.equal(manifest.reachable, true);
  assert.equal(manifest.flightsRequired, 1);
  assert.deepEqual(manifest.flights.map((flight) => flight.total), [1723]);
});

test("C2 plant einen 1723-SCU-Auftrag mit festen Missionskisten", () => {
  const manifest = planMissionManifest({
    ship: {
      name: "Crusader C2 Hercules Starlifter",
      slotCapacities: [...Array(20).fill(32), ...Array(28).fill(2)]
    },
    boxSizes: [32, 24, 16, 8, 4, 2, 1],
    maxBoxSize: 32,
    missions: [
      { label: "Everus Harbor", destination: "Everus Harbor", cargo: "Processed Food", totalSCU: 1723 }
    ]
  });

  assert.equal(manifest.reachable, true);
  assert.equal(manifest.flightsRequired, 3);
  assert.deepEqual(manifest.flights.map((flight) => flight.total), [643, 640, 440]);
  assert.deepEqual(manifest.aggregateBoxes, [
    { size: 32, count: 53 },
    { size: 24, count: 1 },
    { size: 2, count: 1 },
    { size: 1, count: 1 }
  ]);
});

test("RAFT kann drei kleine Ziele kombinieren und braucht fuer einen Grossauftrag einen eigenen Flug", () => {
  const manifest = planMissionManifest({
    ship: {
      name: "Argo RAFT",
      slotCapacities: [32, 32, 32, 32, 32, 32]
    },
    boxSizes: [16, 8, 4, 2, 1],
    maxBoxSize: 16,
    missions: [
      { destination: "Seraphim Station", cargo: "Quartz", totalSCU: 48 },
      { destination: "Baijini Point", cargo: "Quartz", totalSCU: 32 },
      { destination: "Everus Harbor", cargo: "Quartz", totalSCU: 32 },
      { destination: "Pyro Gateway", cargo: "Quartz", totalSCU: 176 }
    ]
  });

  assert.equal(manifest.reachable, true);
  assert.equal(manifest.flightsRequired, 2);
  assert.deepEqual(manifest.flights.map((flight) => flight.total), [176, 112]);
  assert.deepEqual(manifest.flights[0].missions.map((mission) => mission.destination), ["Pyro Gateway"]);
  assert.deepEqual(manifest.flights[1].missions.map((mission) => mission.destination), ["Seraphim Station", "Baijini Point", "Everus Harbor"]);
});

test("Gemeinsame Ladefluege nutzen feste Missionskisten ueber mehrere Ziele", () => {
  const manifest = planMissionManifest({
    ship: {
      name: "Test 10 SCU",
      slotCapacities: [10]
    },
    boxSizes: [8, 4, 2, 1],
    missions: [
      { label: "Ziel A", destination: "Ziel A", cargo: "Medical Supplies", totalSCU: 5 },
      { label: "Ziel B", destination: "Ziel B", cargo: "Medical Supplies", totalSCU: 5 }
    ]
  });

  assert.equal(manifest.reachable, true);
  assert.equal(manifest.flightsRequired, 1);
  assert.deepEqual(manifest.flights.map((flight) => flight.total), [10]);
  assert.deepEqual(manifest.flights[0].missions.map((mission) => mission.boxes), [[4, 1], [4, 1]]);
});

test("Share-State laesst sich per URL roundtrippen", () => {
  const state = {
    language: "de",
    presetId: "argo-raft",
    cargoLiftMaxBoxSize: "16",
    source: "Baijini-Point",
    cargoName: "",
    missions: [
      {
        id: "mission-food",
        cargoName: "Processed Food",
        destination: "Everus Harbor",
        totalSCU: "1723",
        deliveredSCU: 384
      }
    ]
  };

  const url = buildShareUrl("file:///home/rainerw/git/scu-laderaum-planer/index.html", state);
  const decoded = readShareStateFromUrl(url);

  assert.deepEqual(decoded, state);
});
