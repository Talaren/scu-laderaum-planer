import test from "node:test";
import assert from "node:assert/strict";

import { buildFlightPlans, planMission, planMissionManifest } from "../lib/planner.js";
import { SHIP_PRESETS } from "../data/ships.js";

test("RAFT 3x32 liefert 93 SCU exakt in zwei Fluegen", () => {
  const ship = {
    name: "ARGO RAFT (3x32)",
    slotCapacities: [32, 32, 32],
    maxBoxesPerSlot: 1
  };

  const plan = planMission({
    ship,
    boxSizes: [32, 24, 16, 8, 4, 2, 1],
    targetSCU: 93,
    mode: "exact"
  });

  assert.equal(plan.reachable, true);
  assert.equal(plan.flightsRequired, 2);
  assert.equal(plan.deliveredSCU, 93);
  assert.deepEqual(plan.flights.map((flight) => flight.total), [88, 5]);
});

test("RAFT 3x32 erreicht 93 SCU mit Mindestlieferung in einem Flug", () => {
  const ship = {
    name: "ARGO RAFT (3x32)",
    slotCapacities: [32, 32, 32],
    maxBoxesPerSlot: 1
  };

  const plan = planMission({
    ship,
    boxSizes: [32, 24, 16, 8, 4, 2, 1],
    targetSCU: 93,
    mode: "atLeast"
  });

  assert.equal(plan.reachable, true);
  assert.equal(plan.flightsRequired, 1);
  assert.equal(plan.deliveredSCU, 96);
  assert.equal(plan.overfillSCU, 3);
});

test("flexibler Laderaum kann 93 SCU in einem Flug exakt laden", () => {
  const ship = {
    name: "Flex 96",
    slotCapacities: [96],
    maxBoxesPerSlot: null
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
    name: "Flex 96",
    slotCapacities: [96],
    maxBoxesPerSlot: null
  };

  const plan = planMission({
    ship,
    boxSizes: [32, 24, 16, 8, 4, 2],
    targetSCU: 93,
    mode: "exact"
  });

  assert.equal(plan.reachable, false);
});

test("Flight plans respektieren feste Container-Slots", () => {
  const plans = buildFlightPlans(
    {
      name: "ARGO RAFT (3x32)",
      slotCapacities: [32, 32, 32],
      maxBoxesPerSlot: 1
    },
    [32, 24, 16, 8, 4, 2, 1]
  );

  const plan93 = plans.get(93);
  assert.equal(plan93, undefined);

  const plan96 = plans.get(96);
  assert.equal(plan96.total, 96);
  assert.equal(plan96.boxCount, 3);
});

test("RAFT 6x32 packt drei Missionen mit maximal 16-SCU-Kisten in zwei Ladefluege", () => {
  const manifest = planMissionManifest({
    ship: {
      name: "ARGO RAFT 6x32 Mission Cargo",
      slotCapacities: [32, 32, 32, 32, 32, 32],
      maxBoxesPerSlot: null
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
  assert.deepEqual(manifest.flights[0].missions.map((mission) => mission.remainingSCU), [93, 84]);
  assert.deepEqual(manifest.flights[1].missions.map((mission) => mission.remainingSCU), [124]);
});

test("Manifest ignoriert bereits abgeschlossene Missionen", () => {
  const manifest = planMissionManifest({
    ship: {
      name: "ARGO RAFT 6x32 Mission Cargo",
      slotCapacities: [32, 32, 32, 32, 32, 32],
      maxBoxesPerSlot: null
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

test("Gemischte Fracht bleibt pro Auftrag erhalten", () => {
  const manifest = planMissionManifest({
    ship: {
      name: "ARGO RAFT 6x32 Mission Cargo",
      slotCapacities: [32, 32, 32, 32, 32, 32],
      maxBoxesPerSlot: null
    },
    boxSizes: [16, 8, 4, 2, 1],
    missions: [
      { label: "Melodic Fields", cargo: "Hydrogen Fuel", destination: "Melodic Fields", totalSCU: 60 },
      { label: "High Course", cargo: "Quantum Fuel", destination: "High Course", totalSCU: 136 },
      { label: "Thundering Express", cargo: "Ship Ammunition", destination: "Thundering Express", totalSCU: 137 },
      { label: "Green Glade", cargo: "Hydrogen Fuel", destination: "Green Glade", totalSCU: 70 }
    ]
  });

  assert.equal(manifest.reachable, true);
  assert.equal(manifest.flightsRequired, 3);
  assert.deepEqual(manifest.flights.map((flight) => flight.total), [137, 136, 130]);
  assert.deepEqual(manifest.flights[2].missions.map((mission) => mission.cargo), ["Hydrogen Fuel", "Hydrogen Fuel"]);
  assert.deepEqual(manifest.flights[2].missions.map((mission) => mission.remainingSCU), [60, 70]);
});

test("Datenmodell enthaelt drei RAFT-Presets", () => {
  const raftPresets = SHIP_PRESETS.filter((preset) => preset.name.includes("RAFT"));
  assert.equal(raftPresets.length, 3);
});
