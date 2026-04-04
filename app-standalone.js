(function () {
  const DEFAULT_BOX_SIZES = [32, 24, 16, 8, 4, 2, 1];
  const STORAGE_KEY = "scu-laderaum-planer:v3";
  const DEFAULT_LANGUAGE = "en";
  const SUPPORTED_LANGUAGES = ["en", "de"];
  const DESCENDING = (left, right) => right - left;
  const ASCENDING = (left, right) => left - right;
  const BUILD_INFO = normalizeBuildInfo(globalThis.SCU_PLANNER_BUILD_INFO);
  let currentLanguage = DEFAULT_LANGUAGE;
  let formatter = new Intl.NumberFormat("en-US");
  const flightPlanCache = new Map();
  const slotCombinationCache = new Map();

  function normalizeBuildInfo(info) {
    return {
      version: typeof info?.version === "string" ? info.version.trim() : "",
      repositoryUrl: typeof info?.repositoryUrl === "string" ? info.repositoryUrl.trim() : "",
      repositoryLabel: typeof info?.repositoryLabel === "string" ? info.repositoryLabel.trim() : ""
    };
  }

  function deriveRepositoryLabel(repositoryUrl) {
    if (!repositoryUrl) {
      return "";
    }

    try {
      const url = new URL(repositoryUrl);
      const path = url.pathname.replace(/^\/+|\/+$/gu, "").replace(/\.git$/u, "");
      return path || repositoryUrl;
    } catch {
      return repositoryUrl.replace(/\.git$/u, "");
    }
  }

  function getSafeRepositoryUrl(repositoryUrl) {
    if (!repositoryUrl) {
      return "";
    }

    try {
      const url = new URL(repositoryUrl);
      return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
    } catch {
      return "";
    }
  }

  function getTranslationCatalogs() {
    return globalThis.SCU_PLANNER_TRANSLATIONS ?? {};
  }

  function normalizeLanguage(language) {
    return SUPPORTED_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE;
  }

  function getLanguageLocale(language) {
    return language === "de" ? "de-DE" : "en-US";
  }

  function formatTemplate(template, values = {}) {
    return Object.entries(values).reduce(
      (message, [key, value]) => message.replaceAll(`{${key}}`, String(value)),
      template
    );
  }

  function t(key, values = {}) {
    const catalogs = getTranslationCatalogs();
    const normalizedLanguage = normalizeLanguage(currentLanguage);
    const template = catalogs[normalizedLanguage]?.[key]
      ?? catalogs[DEFAULT_LANGUAGE]?.[key]
      ?? key;

    return formatTemplate(template, values);
  }

  function setLanguage(language) {
    currentLanguage = normalizeLanguage(language);
    formatter = new Intl.NumberFormat(getLanguageLocale(currentLanguage));
    document.documentElement.lang = currentLanguage;
    document.title = t("app.title");
  }

  function translateShipGroup(group) {
    return group === "Sonstige" ? t("ship.group.other") : group;
  }

  function translateShipNote(ship) {
    if (ship.noteKey) {
      return t(ship.noteKey);
    }

    return ship.note?.trim() || "";
  }

  function repeatSlots(capacity, count) {
    return Array.from({ length: count }, () => capacity);
  }

  function expandSlotGroups(slotGroups) {
    return slotGroups.flatMap(([capacity, count]) => repeatSlots(capacity, count));
  }

  function createGridPreset({ id, name, group, slotGroups, note = "", noteKey = "" }) {
    return {
      id,
      name,
      group,
      slotCapacities: expandSlotGroups(slotGroups),
      note,
      noteKey
    };
  }

  const SHIP_PRESETS = [
    createGridPreset({
      id: "argo-raft",
      name: "Argo RAFT",
      group: "Argo",
      slotGroups: [[32, 6]],
      noteKey: "ship.note.argoRaft"
    }),
    createGridPreset({ id: "rsi-zeus-mk-ii-cl", name: "RSI Zeus MK II CL", group: "RSI", slotGroups: [[32, 2], [4, 8], [2, 16]] }),
    createGridPreset({ id: "rsi-aurora-es-ln-lx-mr", name: "RSI Aurora ES / LN / LX / MR", group: "RSI", slotGroups: [[2, 1], [1, 1]] }),
    createGridPreset({ id: "rsi-zeus-mk-ii-es", name: "RSI Zeus MK II ES", group: "RSI", slotGroups: [[16, 2]] }),
    createGridPreset({ id: "rsi-polaris", name: "RSI Polaris", group: "RSI", slotGroups: [[32, 12], [24, 8]] }),
    createGridPreset({ id: "rsi-salvation", name: "RSI Salvation", group: "RSI", slotGroups: [[1, 6]] }),
    createGridPreset({ id: "rsi-aurora-cl-se", name: "RSI Aurora CL / SE", group: "RSI", slotGroups: [[2, 3]] }),
    createGridPreset({ id: "rsi-hermes", name: "RSI Hermes", group: "RSI", slotGroups: [[32, 8], [16, 2]] }),
    createGridPreset({ id: "rsi-apollo", name: "RSI Apollo", group: "RSI", slotGroups: [[2, 16]] }),
    createGridPreset({ id: "rsi-perseus", name: "RSI Perseus", group: "RSI", slotGroups: [[32, 3]] }),
    createGridPreset({ id: "rsi-constellation-phoenix", name: "RSI Constellation Phoenix", group: "RSI", slotGroups: [[32, 2], [2, 8]] }),
    createGridPreset({ id: "rsi-constellation-andromeda-aquila", name: "RSI Constellation Andromeda / Aquila", group: "RSI", slotGroups: [[32, 2], [4, 8]] }),
    createGridPreset({ id: "constellation-taurus", name: "RSI Constellation Taurus", group: "RSI", slotGroups: [[32, 2], [24, 2], [4, 14], [1, 6]] }),
    createGridPreset({ id: "rsi-aurora-mk-ii-cargo-module", name: "RSI Aurora MK II w/ Cargo Module", group: "RSI", slotGroups: [[2, 2], [1, 4]] }),
    createGridPreset({ id: "rsi-aurora-mk-ii", name: "RSI Aurora MK II", group: "RSI", slotGroups: [[1, 2]] }),
    createGridPreset({ id: "drake-corsair", name: "Drake Corsair", group: "Drake", slotGroups: [[32, 2], [2, 4]] }),
    createGridPreset({ id: "drake-vulture", name: "Drake Vulture", group: "Drake", slotGroups: [[8, 1], [2, 2]] }),
    createGridPreset({ id: "cutlass-black", name: "Drake Cutlass Black", group: "Drake", slotGroups: [[16, 2], [2, 6], [1, 2]] }),
    createGridPreset({ id: "drake-golem-ox", name: "Drake Golem OX", group: "Drake", slotGroups: [[32, 2]] }),
    createGridPreset({ id: "drake-cutter", name: "Drake Cutter", group: "Drake", slotGroups: [[1, 4]] }),
    createGridPreset({ id: "drake-clipper", name: "Drake Clipper", group: "Drake", slotGroups: [[2, 6]] }),
    createGridPreset({ id: "drake-cutter-scout-rambler", name: "Drake Cutter Scout / Rambler", group: "Drake", slotGroups: [[1, 2]] }),
    createGridPreset({ id: "drake-cutlass-blue-red", name: "Drake Cutlass Blue / Red", group: "Drake", slotGroups: [[2, 4], [1, 4]] }),
    createGridPreset({ id: "drake-mule", name: "Drake Mule", group: "Drake", slotGroups: [[1, 1]] }),
    createGridPreset({
      id: "drake-caterpillar",
      name: "Drake Caterpillar",
      group: "Drake",
      slotGroups: [[24, 18], [4, 4], [2, 56], [1, 16]],
      noteKey: "ship.note.drakeCaterpillar"
    }),
    createGridPreset({ id: "crusader-m2-hercules-starlifter", name: "Crusader M2 Hercules Starlifter", group: "Crusader", slotGroups: [[32, 10], [4, 40], [2, 21]] }),
    createGridPreset({ id: "crusader-a2-hercules-starlifter", name: "Crusader A2 Hercules Starlifter", group: "Crusader", slotGroups: [[32, 6], [4, 1]] }),
    createGridPreset({ id: "crusader-c2-hercules-starlifter", name: "Crusader C2 Hercules Starlifter", group: "Crusader", slotGroups: [[32, 20], [2, 28]] }),
    createGridPreset({ id: "crusader-intrepid", name: "Crusader Intrepid", group: "Crusader", slotGroups: [[2, 4]] }),
    createGridPreset({ id: "crusader-mercury-star-runner", name: "Crusader Mercury Star Runner", group: "Crusader", slotGroups: [[24, 3], [4, 9], [2, 2], [1, 2]] }),
    createGridPreset({ id: "c1-spirit", name: "Crusader C1 Spirit", group: "Crusader", slotGroups: [[32, 2]] }),
    createGridPreset({ id: "aegis-avenger-titan", name: "Aegis Avenger Titan", group: "Aegis", slotGroups: [[4, 2]] }),
    createGridPreset({ id: "aegis-reclaimer", name: "Aegis Reclaimer", group: "Aegis", slotGroups: [[16, 10], [8, 8], [4, 8], [2, 72], [1, 20]] }),
    createGridPreset({ id: "aegis-hammerhead", name: "Aegis Hammerhead", group: "Aegis", slotGroups: [[16, 2], [2, 4]] }),
    createGridPreset({ id: "aegis-idris-p", name: "Aegis Idris-P", group: "Aegis", slotGroups: [[16, 80], [2, 46], [1, 2]] }),
    createGridPreset({ id: "aegis-retaliator", name: "Aegis Retaliator", group: "Aegis", slotGroups: [[24, 1], [16, 1], [2, 16], [1, 2]] }),
    createGridPreset({ id: "aegis-redeemer", name: "Aegis Redeemer", group: "Aegis", slotGroups: [[1, 2]] }),
    createGridPreset({ id: "anvil-carrack", name: "Anvil Carrack", group: "Anvil", slotGroups: [[16, 24], [8, 6], [2, 12]] }),
    createGridPreset({ id: "anvil-pisces-c8-c8x", name: "Anvil Pisces C8 / C8X", group: "Anvil", slotGroups: [[2, 2]] }),
    createGridPreset({ id: "anvil-paladin", name: "Anvil Paladin", group: "Anvil", slotGroups: [[2, 2]] }),
    createGridPreset({ id: "anvil-hornet-f7c-mkii", name: "Anvil Hornet F7C MKII", group: "Anvil", slotGroups: [[1, 2]] }),
    createGridPreset({ id: "anvil-asgard", name: "Anvil Asgard", group: "Anvil", slotGroups: [[32, 4], [2, 24], [1, 4]] }),
    createGridPreset({ id: "anvil-valkyrie", name: "Anvil Valkyrie", group: "Anvil", slotGroups: [[24, 2], [4, 6], [2, 9]] }),
    createGridPreset({ id: "misc-starfarer", name: "MISC Starfarer", group: "MISC", slotGroups: [[24, 6], [16, 2], [4, 10], [2, 35], [1, 5]] }),
    createGridPreset({ id: "misc-freelancer", name: "MISC Freelancer", group: "MISC", slotGroups: [[32, 1], [4, 4], [2, 9]] }),
    createGridPreset({ id: "freelancer-max", name: "MISC Freelancer MAX", group: "MISC", slotGroups: [[32, 2], [4, 8], [2, 12]] }),
    createGridPreset({ id: "misc-freelancer-mis-dur", name: "MISC Freelancer MIS / DUR", group: "MISC", slotGroups: [[16, 1], [4, 2], [2, 6]] }),
    createGridPreset({ id: "hull-a", name: "MISC Hull A", group: "MISC", slotGroups: [[16, 4]] }),
    createGridPreset({ id: "misc-hull-c", name: "MISC Hull C", group: "MISC", slotGroups: [[32, 144]] }),
    createGridPreset({ id: "misc-reliant-tana", name: "MISC Reliant Tana", group: "MISC", slotGroups: [[1, 1]] }),
    createGridPreset({ id: "misc-reliant-kore", name: "MISC Reliant Kore", group: "MISC", slotGroups: [[2, 2], [1, 2]] }),
    createGridPreset({ id: "misc-fortune", name: "MISC Fortune", group: "MISC", slotGroups: [[4, 1], [1, 12]] }),
    createGridPreset({ id: "misc-starlancer-max", name: "MISC Starlancer MAX", group: "MISC", slotGroups: [[32, 6], [4, 8]] }),
    createGridPreset({ id: "misc-starlancer-tac", name: "MISC Starlancer TAC", group: "MISC", slotGroups: [[32, 2], [4, 8]] }),
    createGridPreset({ id: "origin-135c", name: "Origin 135c", group: "Origin", slotGroups: [[2, 3]] }),
    createGridPreset({ id: "origin-100i-125a", name: "Origin 100i / 125a", group: "Origin", slotGroups: [[2, 1]] }),
    createGridPreset({ id: "origin-400i", name: "Origin 400i", group: "Origin", slotGroups: [[24, 1], [2, 8], [1, 2]] }),
    createGridPreset({ id: "origin-600i-touring", name: "Origin 600i Touring", group: "Origin", slotGroups: [[2, 8], [1, 4]] }),
    createGridPreset({
      id: "origin-600i-explorer",
      name: "Origin 600i Explorer",
      group: "Origin",
      slotGroups: [[2, 20], [1, 4]],
      noteKey: "ship.note.origin600iExplorer"
    }),
    createGridPreset({ id: "origin-890-jump", name: "Origin 890 Jump", group: "Origin", slotGroups: [[32, 6], [24, 4], [16, 2], [2, 28], [1, 12]] }),
    createGridPreset({ id: "origin-325a-350r", name: "Origin 325a / 350r", group: "Origin", slotGroups: [[4, 1]] }),
    createGridPreset({ id: "origin-315p", name: "Origin 315p", group: "Origin", slotGroups: [[4, 3]] }),
    createGridPreset({ id: "origin-300i", name: "Origin 300i", group: "Origin", slotGroups: [[4, 2]] }),
    createGridPreset({ id: "argo-mpuv-c", name: "Argo Astronautics MPUV-C", group: "Argo", slotGroups: [[2, 1]] }),
    createGridPreset({ id: "argo-mpuv-t", name: "Argo Astronautics MPUV-T", group: "Argo", slotGroups: [[16, 1]] }),
    createGridPreset({ id: "argo-csv-sm", name: "Argo Astronautics CSV-SM", group: "Argo", slotGroups: [[4, 1]] }),
    createGridPreset({ id: "argo-srv", name: "Argo Astronautics SRV", group: "Argo", slotGroups: [[4, 2], [2, 2]] }),
    createGridPreset({ id: "argo-mole", name: "Argo Astronautics MOLE", group: "Argo", slotGroups: [[16, 2]] }),
    createGridPreset({ id: "argo-moth", name: "Argo Astronautics MOTH", group: "Argo", slotGroups: [[24, 8], [16, 2]] }),
    createGridPreset({
      id: "esperia-prowler-utility",
      name: "Esperia Prowler Utility",
      group: "Sonstige",
      slotGroups: [[16, 2]],
      noteKey: "ship.note.esperiaProwlerUtility"
    }),
    createGridPreset({ id: "tumbril-cyclone", name: "Tumbril Cyclone", group: "Sonstige", slotGroups: [[1, 1]] }),
    createGridPreset({ id: "consolidated-outland-nomad", name: "Consolidated Outland Nomad", group: "Sonstige", slotGroups: [[16, 1], [2, 4]] }),
    createGridPreset({ id: "consolidated-outland-mustang-alpha", name: "Consolidated Outland Mustang Alpha", group: "Sonstige", slotGroups: [[2, 2]] }),
    createGridPreset({ id: "shiv", name: "Shiv", group: "Sonstige", slotGroups: [[32, 1]] }),
    createGridPreset({ id: "syulen", name: "Syulen", group: "Sonstige", slotGroups: [[1, 6]] })
  ];

  function getShipPresetById(presetId) {
    return SHIP_PRESETS.find((preset) => preset.id === presetId) ?? SHIP_PRESETS[0];
  }

  function sumValues(values) {
    return values.reduce((sum, value) => sum + value, 0);
  }

  function countCapacities(slotCapacities) {
    const counts = new Map();

    for (const capacity of slotCapacities) {
      counts.set(capacity, (counts.get(capacity) ?? 0) + 1);
    }

    return [...counts.entries()].sort((left, right) => right[0] - left[0]);
  }

  function formatSlotCapacitiesCompact(slotCapacities) {
    return countCapacities(slotCapacities)
      .map(([capacity, count]) => `${count}x${capacity}`)
      .join(", ");
  }

  function normalizeBoxSizes(boxSizes) {
    return [...new Set(boxSizes.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0))].sort(DESCENDING);
  }

  function normalizeMaxBoxSize(maxBoxSize) {
    const parsed = Math.trunc(Number(maxBoxSize));
    return parsed > 0 ? parsed : null;
  }

  function constrainBoxSizes(boxSizes, maxBoxSize = null) {
    const normalizedBoxSizes = normalizeBoxSizes(boxSizes);
    const normalizedMaxBoxSize = normalizeMaxBoxSize(maxBoxSize);

    if (normalizedMaxBoxSize == null) {
      return normalizedBoxSizes;
    }

    return normalizedBoxSizes.filter((size) => size <= normalizedMaxBoxSize);
  }

  function getMaxLoadableContainerSize(ship) {
    return Math.max(...ship.slotCapacities);
  }

  function normalizeShip(ship) {
    const slotCapacities = (ship.slotCapacities ?? [])
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0)
      .map((value) => Math.trunc(value));

    if (!slotCapacities.length) {
      throw new Error(t("errors.needSlot"));
    }

    return {
      id: ship.id ?? "custom",
      name: ship.name?.trim() || t("ship.customName"),
      note: ship.note?.trim() || "",
      noteKey: ship.noteKey ?? "",
      slotCapacities,
      totalCapacity: sumValues(slotCapacities)
    };
  }

  function describeSlotCapacities(slotCapacities) {
    return countCapacities(slotCapacities)
      .map(([capacity, count]) => `${count}x ${capacity} SCU`)
      .join(", ");
  }

  function countBoxes(boxes) {
    const counts = new Map();
    for (const size of boxes) {
      counts.set(size, (counts.get(size) ?? 0) + 1);
    }

    return [...counts.entries()]
      .sort((left, right) => right[0] - left[0])
      .map(([size, count]) => ({ size, count }));
  }

  function formatBoxSummary(input) {
    const groups = input.length && typeof input[0] === "number" ? countBoxes(input) : input;
    return groups.length
      ? groups.map(({ size, count }) => `${count}x ${size} SCU`).join(", ")
      : t("result.noBoxes");
  }

  function buildGreedyMissionBoxes(targetSCU, boxSizes) {
    const normalizedTarget = Math.trunc(Number(targetSCU));
    if (!(normalizedTarget > 0)) {
      return [];
    }

    const normalizedBoxSizes = normalizeBoxSizes(boxSizes);
    const boxes = [];
    let remainingSCU = normalizedTarget;

    for (const size of normalizedBoxSizes) {
      const count = Math.floor(remainingSCU / size);
      if (count <= 0) {
        continue;
      }

      for (let index = 0; index < count; index += 1) {
        boxes.push(size);
      }

      remainingSCU -= count * size;
    }

    return remainingSCU === 0 ? sortBoxes(boxes) : null;
  }

  function sortBoxes(boxes) {
    return [...boxes].sort(DESCENDING);
  }

  function compareNumberListsDescending(left, right) {
    const maxLength = Math.max(left.length, right.length);

    for (let index = 0; index < maxLength; index += 1) {
      const leftValue = left[index] ?? Number.NEGATIVE_INFINITY;
      const rightValue = right[index] ?? Number.NEGATIVE_INFINITY;

      if (leftValue !== rightValue) {
        return rightValue - leftValue;
      }
    }

    return left.length - right.length;
  }

  function compareNumberListsAscending(left, right) {
    const maxLength = Math.max(left.length, right.length);

    for (let index = 0; index < maxLength; index += 1) {
      const leftValue = left[index] ?? Number.POSITIVE_INFINITY;
      const rightValue = right[index] ?? Number.POSITIVE_INFINITY;

      if (leftValue !== rightValue) {
        return leftValue - rightValue;
      }
    }

    return left.length - right.length;
  }

  function countsFitWithin(neededCounts, availableCounts) {
    for (let index = 0; index < neededCounts.length; index += 1) {
      if ((neededCounts[index] ?? 0) > (availableCounts[index] ?? 0)) {
        return false;
      }
    }

    return true;
  }

  function subtractCounts(availableCounts, usedCounts) {
    return availableCounts.map((count, index) => count - (usedCounts[index] ?? 0));
  }

  function isBetterLoad(candidate, current) {
    if (!current) {
      return true;
    }

    if (candidate.boxCount !== current.boxCount) {
      return candidate.boxCount < current.boxCount;
    }

    return compareNumberListsDescending(candidate.boxes, current.boxes) < 0;
  }

  function buildSlotPlans(capacity, boxSizes) {
    const sizes = normalizeBoxSizes(boxSizes).filter((size) => size <= capacity);
    const best = Array.from({ length: capacity + 1 }, () => null);
    best[0] = { total: 0, boxes: [], boxCount: 0 };

    for (let total = 1; total <= capacity; total += 1) {
      for (const size of sizes) {
        if (size > total) {
          continue;
        }

        const previous = best[total - size];
        if (!previous) {
          continue;
        }

        const boxCount = previous.boxCount + 1;
        const candidate = {
          total,
          boxes: sortBoxes([...previous.boxes, size]),
          boxCount
        };

        if (isBetterLoad(candidate, best[total])) {
          best[total] = candidate;
        }
      }
    }

    return best;
  }

  function buildSlotCombinations(capacity, boxSizes) {
    const sizes = normalizeBoxSizes(boxSizes);
    const cacheKey = `${capacity}|${sizes.join(",")}`;
    const cached = slotCombinationCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const counts = Array.from({ length: sizes.length }, () => 0);
    const combinations = [];

    function search(sizeIndex, remainingCapacity, total, boxCount) {
      if (sizeIndex >= sizes.length) {
        const boxes = expandBoxCounts(counts, sizes);
        combinations.push({
          total,
          boxCount,
          counts: [...counts],
          boxes
        });
        return;
      }

      const size = sizes[sizeIndex];
      const maxUse = Math.floor(remainingCapacity / size);

      for (let use = maxUse; use >= 0; use -= 1) {
        counts[sizeIndex] = use;
        search(sizeIndex + 1, remainingCapacity - (use * size), total + (use * size), boxCount + use);
      }

      counts[sizeIndex] = 0;
    }

    search(0, capacity, 0, 0);
    combinations.sort((left, right) => {
      if (left.total !== right.total) {
        return right.total - left.total;
      }

      if (left.boxCount !== right.boxCount) {
        return left.boxCount - right.boxCount;
      }

      return compareNumberListsDescending(left.boxes, right.boxes);
    });

    slotCombinationCache.set(cacheKey, combinations);
    return combinations;
  }

  function cloneFlightPlan(plan) {
    return {
      total: plan.total,
      boxes: [...plan.boxes],
      boxCount: plan.boxCount,
      slotAssignments: plan.slotAssignments.map((slot) => ({
        slotIndex: slot.slotIndex,
        capacity: slot.capacity,
        used: slot.used,
        free: slot.free,
        boxes: [...slot.boxes]
      }))
    };
  }

  function compareSlotUsage(candidate, current) {
    const candidateUsage = candidate.slotAssignments.map((slot) => slot.used).sort(DESCENDING);
    const currentUsage = current.slotAssignments.map((slot) => slot.used).sort(DESCENDING);
    return compareNumberListsDescending(candidateUsage, currentUsage);
  }

  function isBetterFlightPlan(candidate, current) {
    if (!current) {
      return true;
    }

    if (candidate.boxCount !== current.boxCount) {
      return candidate.boxCount < current.boxCount;
    }

    const boxComparison = compareNumberListsDescending(candidate.boxes, current.boxes);
    if (boxComparison !== 0) {
      return boxComparison < 0;
    }

    return compareSlotUsage(candidate, current) < 0;
  }

  function isBetterPackedFlight(candidate, current) {
    if (!current) {
      return true;
    }

    if (candidate.total !== current.total) {
      return candidate.total > current.total;
    }

    if (candidate.boxCount !== current.boxCount) {
      return candidate.boxCount < current.boxCount;
    }

    const boxComparison = compareNumberListsDescending(candidate.boxes, current.boxes);
    if (boxComparison !== 0) {
      return boxComparison < 0;
    }

    return compareSlotUsage(candidate, current) < 0;
  }

  function buildScoreWeights(length, base) {
    const weights = Array(length);
    let current = 1n;

    for (let index = length - 1; index >= 0; index -= 1) {
      weights[index] = current;
      current *= base;
    }

    return weights;
  }

  function buildBoxScore(boxes, sizeIndexMap, boxWeights) {
    let score = 0n;
    const counts = Array.from({ length: boxWeights.length }, () => 0);

    for (const size of boxes) {
      const index = sizeIndexMap.get(size);
      if (index != null) {
        counts[index] += 1;
      }
    }

    for (let index = 0; index < counts.length; index += 1) {
      if (!counts[index]) {
        continue;
      }

      score += BigInt(counts[index]) * boxWeights[index];
    }

    return score;
  }

  function buildFillWeights(maxSlotCapacity, slotCount) {
    const base = BigInt(slotCount + 1);
    const weights = Array.from({ length: maxSlotCapacity + 1 }, () => 0n);
    let current = base;

    for (let fill = 1; fill <= maxSlotCapacity; fill += 1) {
      weights[fill] = current;
      current *= base;
    }

    return weights;
  }

  function isBetterFlightState(candidate, current) {
    if (!current) {
      return true;
    }

    if (candidate.boxCount !== current.boxCount) {
      return candidate.boxCount < current.boxCount;
    }

    if (candidate.boxScore !== current.boxScore) {
      return candidate.boxScore > current.boxScore;
    }

    return candidate.usedScore > current.usedScore;
  }

  function reconstructFlightPlan(finalState, slotPlanCache) {
    const slotAssignments = [];
    let cursor = finalState;

    while (cursor?.prev) {
      const slotPlan = slotPlanCache.get(cursor.capacity)[cursor.fill].plan;
      slotAssignments.push({
        slotIndex: cursor.slotIndex,
        capacity: cursor.capacity,
        used: cursor.fill,
        free: cursor.capacity - cursor.fill,
        boxes: [...slotPlan.boxes]
      });
      cursor = cursor.prev;
    }

    slotAssignments.reverse();

    return {
      total: finalState.total,
      boxes: sortBoxes(slotAssignments.flatMap((slot) => slot.boxes)),
      boxCount: finalState.boxCount,
      slotAssignments
    };
  }

  function removeBoxes(availableBoxes, usedBoxes) {
    const usedCounts = new Map();
    for (const box of usedBoxes) {
      usedCounts.set(box, (usedCounts.get(box) ?? 0) + 1);
    }

    const remainingBoxes = [];

    for (const box of availableBoxes) {
      const remaining = usedCounts.get(box) ?? 0;
      if (remaining > 0) {
        usedCounts.set(box, remaining - 1);
      } else {
        remainingBoxes.push(box);
      }
    }

    return remainingBoxes;
  }

  function tryPackAllBoxesGreedy(ship, boxes) {
    const normalizedShip = normalizeShip(ship);
    const slotAssignments = normalizedShip.slotCapacities.map((capacity, index) => ({
      slotIndex: index + 1,
      capacity,
      used: 0,
      free: capacity,
      boxes: []
    }));

    for (const box of sortBoxes(boxes)) {
      let targetSlot = null;

      for (const slot of slotAssignments) {
        if (slot.free < box) {
          continue;
        }

        if (!targetSlot || slot.free < targetSlot.free || (slot.free === targetSlot.free && slot.slotIndex < targetSlot.slotIndex)) {
          targetSlot = slot;
        }
      }

      if (!targetSlot) {
        return null;
      }

      targetSlot.boxes.push(box);
      targetSlot.used += box;
      targetSlot.free -= box;
    }

    return {
      total: sumValues(boxes),
      boxes: sortBoxes(boxes),
      boxCount: boxes.length,
      slotAssignments
    };
  }

  function packBoxesIntoFlight(ship, boxes) {
    const normalizedShip = normalizeShip(ship);
    const availableBoxes = sortBoxes(boxes);

    if (!availableBoxes.length) {
      return {
        total: 0,
        boxes: [],
        boxCount: 0,
        slotAssignments: normalizedShip.slotCapacities.map((capacity, index) => ({
          slotIndex: index + 1,
          capacity,
          used: 0,
          free: capacity,
          boxes: []
        }))
      };
    }

    const greedyFullPlan = sumValues(availableBoxes) <= normalizedShip.totalCapacity
      ? tryPackAllBoxesGreedy(normalizedShip, availableBoxes)
      : null;

    if (greedyFullPlan) {
      return greedyFullPlan;
    }

    const sizes = normalizeBoxSizes(availableBoxes);
    const initialCounts = createBoxCounts(availableBoxes, sizes);
    const sortedSlots = normalizedShip.slotCapacities
      .map((capacity, index) => ({ slotIndex: index + 1, capacity }))
      .sort((left, right) => right.capacity - left.capacity || left.slotIndex - right.slotIndex);
    const memo = new Map();

    function search(slotIndex, remainingCounts) {
      const memoKey = `${slotIndex}|${boxCountsKey(remainingCounts)}`;
      if (memo.has(memoKey)) {
        return memo.get(memoKey);
      }

      if (slotIndex >= sortedSlots.length) {
        const emptyResult = {
          total: 0,
          boxes: [],
          boxCount: 0,
          slotAssignments: []
        };
        memo.set(memoKey, emptyResult);
        return emptyResult;
      }

      const slot = sortedSlots[slotIndex];
      let best = null;

      for (const combination of buildSlotCombinations(slot.capacity, sizes)) {
        if (!countsFitWithin(combination.counts, remainingCounts)) {
          continue;
        }

        const rest = search(slotIndex + 1, subtractCounts(remainingCounts, combination.counts));
        if (!rest) {
          continue;
        }

        const candidate = {
          total: combination.total + rest.total,
          boxes: sortBoxes([...combination.boxes, ...rest.boxes]),
          boxCount: combination.boxCount + rest.boxCount,
          slotAssignments: [
            {
              slotIndex: slot.slotIndex,
              capacity: slot.capacity,
              used: combination.total,
              free: slot.capacity - combination.total,
              boxes: [...combination.boxes]
            },
            ...rest.slotAssignments
          ]
        };

        if (isBetterPackedFlight(candidate, best)) {
          best = candidate;
        }
      }

      memo.set(memoKey, best);
      return best;
    }

    const packed = search(0, initialCounts);
    return {
      total: packed?.total ?? 0,
      boxes: sortBoxes(packed?.boxes ?? []),
      boxCount: packed?.boxCount ?? 0,
      slotAssignments: (packed?.slotAssignments ?? [])
        .sort((left, right) => left.slotIndex - right.slotIndex)
    };
  }

  function planBoxesAcrossFlights(ship, boxes) {
    const normalizedShip = normalizeShip(ship);
    const targetBoxes = sortBoxes(boxes);
    const flights = [];
    let remainingBoxes = targetBoxes;

    while (remainingBoxes.length) {
      const packedFlight = packBoxesIntoFlight(normalizedShip, remainingBoxes);
      if (!(packedFlight.total > 0) || !packedFlight.boxes.length) {
        return {
          reachable: false,
          ship: normalizedShip
        };
      }

      flights.push({
        number: flights.length + 1,
        ...packedFlight
      });
      remainingBoxes = removeBoxes(remainingBoxes, packedFlight.boxes);
    }

    return {
      reachable: true,
      ship: normalizedShip,
      exact: true,
      deliveredSCU: sumValues(targetBoxes),
      overfillSCU: 0,
      missingSCU: 0,
      flightsRequired: flights.length,
      flights,
      aggregateBoxes: countBoxes(targetBoxes)
    };
  }

  function buildFlightPlans(ship, boxSizes) {
    const normalizedShip = normalizeShip(ship);
    const normalizedBoxSizes = normalizeBoxSizes(boxSizes);
    const cacheKey = `${normalizedShip.slotCapacities.join(",")}|${normalizedBoxSizes.join(",")}`;
    const cached = flightPlanCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const totalCapacity = normalizedShip.totalCapacity;
    const maxSlotCapacity = Math.max(...normalizedShip.slotCapacities);
    const sizeIndexMap = new Map(normalizedBoxSizes.map((size, index) => [size, index]));
    const boxWeights = buildScoreWeights(normalizedBoxSizes.length, BigInt(totalCapacity + 1));
    const fillWeights = buildFillWeights(maxSlotCapacity, normalizedShip.slotCapacities.length);
    const slotPlanCache = new Map();

    const getPreparedSlotPlans = (capacity) => {
      if (slotPlanCache.has(capacity)) {
        return slotPlanCache.get(capacity);
      }

      const preparedPlans = buildSlotPlans(capacity, normalizedBoxSizes).map((plan) => {
        if (!plan) {
          return null;
        }

        return {
          plan,
          boxScore: buildBoxScore(plan.boxes, sizeIndexMap, boxWeights)
        };
      });

      slotPlanCache.set(capacity, preparedPlans);
      return preparedPlans;
    };

    let states = Array.from({ length: totalCapacity + 1 }, () => null);
    let reachableMax = 0;
    states[0] = {
      total: 0,
      boxCount: 0,
      boxScore: 0n,
      usedScore: 0n,
      prev: null,
      fill: 0,
      slotIndex: 0,
      capacity: 0
    };

    normalizedShip.slotCapacities.forEach((capacity, index) => {
      const preparedSlotPlans = getPreparedSlotPlans(capacity);
      const nextStates = Array.from({ length: totalCapacity + 1 }, () => null);

      for (let total = 0; total <= reachableMax; total += 1) {
        const state = states[total];
        if (!state) {
          continue;
        }

        for (let fill = 0; fill <= capacity; fill += 1) {
          const preparedSlotPlan = preparedSlotPlans[fill];
          if (!preparedSlotPlan) {
            continue;
          }

          const nextTotal = total + fill;
          const candidate = {
            total: nextTotal,
            boxCount: state.boxCount + preparedSlotPlan.plan.boxCount,
            boxScore: state.boxScore + preparedSlotPlan.boxScore,
            usedScore: state.usedScore + fillWeights[fill],
            prev: state,
            fill,
            slotIndex: index + 1,
            capacity
          };

          if (isBetterFlightState(candidate, nextStates[nextTotal])) {
            nextStates[nextTotal] = candidate;
          }
        }
      }

      reachableMax += capacity;
      states = nextStates;
    });

    const plans = new Map();

    for (let total = 1; total <= reachableMax; total += 1) {
      const state = states[total];
      if (!state) {
        continue;
      }

      plans.set(total, reconstructFlightPlan(state, slotPlanCache));
    }

    flightPlanCache.set(cacheKey, plans);
    return plans;
  }

  function pickBestAtLeast(bestStates, targetSCU) {
    let chosenTotal = null;

    for (let total = targetSCU; total < bestStates.length; total += 1) {
      const state = bestStates[total];
      if (!state) {
        continue;
      }

      if (
        chosenTotal == null ||
        state.flights < bestStates[chosenTotal].flights ||
        (state.flights === bestStates[chosenTotal].flights && total < chosenTotal)
      ) {
        chosenTotal = total;
      }
    }

    return chosenTotal;
  }

  function isBetterMissionState(candidate, current) {
    if (!current) {
      return true;
    }

    if (candidate.flights !== current.flights) {
      return candidate.flights < current.flights;
    }

    return candidate.flightTotal > current.flightTotal;
  }

  function planMission({ ship, boxSizes, maxBoxSize = null, targetSCU, mode = "exact" }) {
    const normalizedTarget = Math.trunc(Number(targetSCU));
    if (!(normalizedTarget > 0)) {
      throw new Error(t("errors.needPositiveMission"));
    }

    const normalizedShip = normalizeShip(ship);
    const normalizedMaxBoxSize = normalizeMaxBoxSize(maxBoxSize);
    const maxLoadableContainerSize = getMaxLoadableContainerSize(normalizedShip);

    if (normalizedMaxBoxSize != null && normalizedMaxBoxSize > maxLoadableContainerSize) {
      return {
        reachable: false,
        reason: "max-box-size-too-large",
        mode,
        ship: normalizedShip,
        maxBoxSize: normalizedMaxBoxSize,
        maxLoadableContainerSize,
        boxSizes: constrainBoxSizes(boxSizes, maxBoxSize),
        targetSCU: normalizedTarget
      };
    }

    const normalizedBoxSizes = constrainBoxSizes(boxSizes, maxBoxSize);
    if (!normalizedBoxSizes.length) {
      throw new Error(t("errors.needFittingBoxSize"));
    }

    const missionBoxes = buildGreedyMissionBoxes(normalizedTarget, normalizedBoxSizes);
    if (!missionBoxes) {
      return {
        reachable: false,
        mode,
        ship: normalizedShip,
        maxBoxSize: normalizedMaxBoxSize,
        boxSizes: normalizedBoxSizes,
        targetSCU: normalizedTarget
      };
    }

    const boxPlan = planBoxesAcrossFlights(normalizedShip, missionBoxes);
    if (!boxPlan.reachable) {
      return {
        reachable: false,
        mode,
        ship: normalizedShip,
        maxBoxSize: normalizedMaxBoxSize,
        boxSizes: normalizedBoxSizes,
        targetSCU: normalizedTarget
      };
    }

    return {
      reachable: true,
      exact: true,
      mode,
      ship: normalizedShip,
      maxBoxSize: normalizedMaxBoxSize,
      boxSizes: normalizedBoxSizes,
      targetSCU: normalizedTarget,
      deliveredSCU: normalizedTarget,
      overfillSCU: 0,
      missingSCU: 0,
      flightsRequired: boxPlan.flightsRequired,
      flights: boxPlan.flights,
      aggregateBoxes: boxPlan.aggregateBoxes
    };
  }

  function normalizeMissionEntry(mission, index) {
    const totalSCU = Math.trunc(Number(mission.totalSCU ?? mission.targetSCU ?? mission.amountSCU));
    const deliveredSCU = Math.max(0, Math.trunc(Number(mission.deliveredSCU ?? 0)));

    if (!(totalSCU > 0)) {
      throw new Error(t("errors.needPositiveMission"));
    }

    if (deliveredSCU > totalSCU) {
      throw new Error(t("errors.tooMuchDelivered", { index: index + 1 }));
    }

    return {
      id: mission.id ?? `mission-${index + 1}`,
      label: mission.label?.trim() || t("mission.label", { index: index + 1 }),
      cargo: mission.cargo?.trim() || "",
      source: mission.source?.trim() || "",
      destination: mission.destination?.trim() || t("mission.defaultDestination", { index: index + 1 }),
      totalSCU,
      deliveredSCU,
      remainingSCU: totalSCU - deliveredSCU
    };
  }

  function normalizeMissionEntries(missions) {
    const normalized = missions.map(normalizeMissionEntry);
    const activeMissions = normalized.filter((mission) => mission.remainingSCU > 0);
    const completedMissions = normalized.filter((mission) => mission.remainingSCU === 0);

    return {
      missions: normalized,
      activeMissions,
      completedMissions,
      totalSCU: sumValues(normalized.map((mission) => mission.totalSCU)),
      deliveredSCU: sumValues(normalized.map((mission) => mission.deliveredSCU)),
      remainingSCU: sumValues(normalized.map((mission) => mission.remainingSCU))
    };
  }

  function countBits(mask) {
    let value = mask;
    let count = 0;

    while (value > 0) {
      count += value & 1;
      value >>= 1;
    }

    return count;
  }

  function buildSortedProfile(profile, value, sorter = DESCENDING) {
    return [...profile, value].sort(sorter);
  }

  function isBetterManifestState(candidate, current) {
    if (!current) {
      return true;
    }

    if (candidate.flights !== current.flights) {
      return candidate.flights < current.flights;
    }

    const loadComparison = compareNumberListsDescending(candidate.loadProfile, current.loadProfile);
    if (loadComparison !== 0) {
      return loadComparison < 0;
    }

    return compareNumberListsAscending(candidate.stopProfile, current.stopProfile) < 0;
  }

  function sumBoxCounts(counts, sizes) {
    return counts.reduce((sum, count, index) => sum + count * sizes[index], 0);
  }

  function createBoxCounts(boxes, sizes) {
    const counts = Array.from({ length: sizes.length }, () => 0);

    for (const box of boxes) {
      const index = sizes.indexOf(box);
      if (index >= 0) {
        counts[index] += 1;
      }
    }

    return counts;
  }

  function boxCountsKey(counts) {
    return counts.join(",");
  }

  function expandBoxCounts(counts, sizes) {
    const boxes = [];

    for (let index = 0; index < counts.length; index += 1) {
      for (let count = 0; count < counts[index]; count += 1) {
        boxes.push(sizes[index]);
      }
    }

    return boxes;
  }

  function getTargetCombinations(targetSCU, sizes, availableCounts, memo) {
    const memoKey = `${targetSCU}|${boxCountsKey(availableCounts)}`;
    const cached = memo.get(memoKey);
    if (cached) {
      return cached;
    }

    const combinations = [];
    const working = Array.from({ length: sizes.length }, () => 0);

    function search(index, remainingSCU, usedBoxes, remainingCapacity) {
      if (remainingSCU === 0) {
        combinations.push({
          counts: [...working],
          boxCount: usedBoxes
        });
        return;
      }

      if (index >= sizes.length || remainingSCU < 0 || remainingSCU > remainingCapacity) {
        return;
      }

      const size = sizes[index];
      const maxUse = Math.min(availableCounts[index], Math.floor(remainingSCU / size));
      const nextRemainingCapacityBase = remainingCapacity - (availableCounts[index] * size);

      for (let use = maxUse; use >= 0; use -= 1) {
        working[index] = use;
        search(
          index + 1,
          remainingSCU - (use * size),
          usedBoxes + use,
          nextRemainingCapacityBase + ((availableCounts[index] - use) * size)
        );
      }

      working[index] = 0;
    }

    search(0, targetSCU, 0, sumBoxCounts(availableCounts, sizes));
    combinations.sort((left, right) => {
      if (left.boxCount !== right.boxCount) {
        return left.boxCount - right.boxCount;
      }

      return compareNumberListsDescending(left.counts, right.counts);
    });

    memo.set(memoKey, combinations);
    return combinations;
  }

  function allocateBoxesToMissions(boxes, missions) {
    if (!missions.length) {
      return [];
    }

    if (missions.length === 1) {
      return [{
        ...missions[0],
        boxes: sortBoxes(boxes),
        boxSummary: countBoxes(boxes)
      }];
    }

    const sizes = normalizeBoxSizes(boxes);
    const initialCounts = createBoxCounts(boxes, sizes);
    const orderedMissions = missions
      .map((mission, index) => ({ ...mission, originalIndex: index }))
      .sort((left, right) => right.remainingSCU - left.remainingSCU);
    const combinationMemo = new Map();
    const allocationMemo = new Map();

    function search(missionIndex, availableCounts) {
      const memoKey = `${missionIndex}|${boxCountsKey(availableCounts)}`;
      if (allocationMemo.has(memoKey)) {
        return allocationMemo.get(memoKey);
      }

      let result = null;

      if (missionIndex === orderedMissions.length - 1) {
        if (sumBoxCounts(availableCounts, sizes) === orderedMissions[missionIndex].remainingSCU) {
          result = [availableCounts];
        }
      } else {
        const mission = orderedMissions[missionIndex];
        const combinations = getTargetCombinations(mission.remainingSCU, sizes, availableCounts, combinationMemo);

        for (const combination of combinations) {
          const nextCounts = availableCounts.map((count, index) => count - combination.counts[index]);
          const remainder = search(missionIndex + 1, nextCounts);
          if (remainder) {
            result = [combination.counts, ...remainder];
            break;
          }
        }
      }

      allocationMemo.set(memoKey, result);
      return result;
    }

    const allocatedCounts = search(0, initialCounts);
    if (!allocatedCounts) {
      return null;
    }

    return orderedMissions
      .map((mission, index) => {
        const missionBoxes = expandBoxCounts(allocatedCounts[index], sizes);
        return {
          ...mission,
          boxes: missionBoxes,
          boxSummary: countBoxes(missionBoxes)
        };
      })
      .sort((left, right) => left.originalIndex - right.originalIndex)
      .map(({ originalIndex, ...mission }) => mission);
  }

  function planMissionManifest({ ship, boxSizes, maxBoxSize = null, missions }) {
    const normalizedShip = normalizeShip(ship);
    const normalizedMaxBoxSize = normalizeMaxBoxSize(maxBoxSize);
    const maxLoadableContainerSize = getMaxLoadableContainerSize(normalizedShip);
    const normalizedBoxSizes = constrainBoxSizes(boxSizes, maxBoxSize);
    if (!normalizedBoxSizes.length) {
      throw new Error(t("errors.needFittingBoxSize"));
    }

    const manifest = normalizeMissionEntries(missions);
    const activeMissions = manifest.activeMissions;

    if (!activeMissions.length) {
      return {
        reachable: true,
        ship: normalizedShip,
        maxBoxSize: normalizedMaxBoxSize,
        boxSizes: normalizedBoxSizes,
        ...manifest,
        flightsRequired: 0,
        flights: [],
        aggregateBoxes: []
      };
    }

    if (normalizedMaxBoxSize != null && normalizedMaxBoxSize > maxLoadableContainerSize) {
      return {
        reachable: false,
        ship: normalizedShip,
        maxBoxSize: normalizedMaxBoxSize,
        maxLoadableContainerSize,
        boxSizes: normalizedBoxSizes,
        ...manifest,
        reason: "max-box-size-too-large",
        blockingMissions: activeMissions
      };
    }

    const dedicatedFlights = [];
    const packableMissions = [];
    const blockingMissions = [];

    for (const mission of activeMissions) {
      const missionBoxes = buildGreedyMissionBoxes(mission.remainingSCU, normalizedBoxSizes);
      if (!missionBoxes) {
        blockingMissions.push(mission);
        continue;
      }

      const exactPlan = planBoxesAcrossFlights(normalizedShip, missionBoxes);

      if (!exactPlan.reachable) {
        blockingMissions.push(mission);
        continue;
      }

      if (exactPlan.flightsRequired === 1) {
        packableMissions.push({
          ...mission,
          boxes: [...exactPlan.flights[0].boxes]
        });
        continue;
      }

      const stagedFlights = exactPlan.flights;

      for (const stagedFlight of stagedFlights.slice(0, -1)) {
        dedicatedFlights.push({
          totalSCU: stagedFlight.total,
          plan: stagedFlight,
          missions: [
            {
              ...mission,
              remainingSCU: stagedFlight.total,
              boxes: [...stagedFlight.boxes]
            }
          ],
          stops: 1
        });
      }

      const finalRemainder = stagedFlights[stagedFlights.length - 1];
      packableMissions.push({
        ...mission,
        remainingSCU: finalRemainder.total,
        boxes: [...finalRemainder.boxes]
      });
    }

    if (blockingMissions.length) {
      return {
        reachable: false,
        ship: normalizedShip,
        maxBoxSize: normalizedMaxBoxSize,
        boxSizes: normalizedBoxSizes,
        ...manifest,
        reason: "single-mission-unreachable",
        blockingMissions
      };
    }

    let selectedFlights = [];

    if (packableMissions.length) {
      if (packableMissions.length > 15) {
        throw new Error(t("errors.tooManyPackableMissions"));
      }

      const subsetPlans = new Map();
      const singleMissionIssues = [];
      const fullMask = (1 << packableMissions.length) - 1;

      for (let mask = 1; mask <= fullMask; mask += 1) {
        const subsetMissions = [];
        let totalSCU = 0;
        let subsetBoxes = [];

        for (let index = 0; index < packableMissions.length; index += 1) {
          if ((mask & (1 << index)) === 0) {
            continue;
          }

          subsetMissions.push(packableMissions[index]);
          totalSCU += packableMissions[index].remainingSCU;
          subsetBoxes = subsetBoxes.concat(packableMissions[index].boxes ?? []);
        }

        const exactPlan = packBoxesIntoFlight(normalizedShip, subsetBoxes);

        if (exactPlan.total !== totalSCU) {
          if (countBits(mask) === 1) {
            singleMissionIssues.push(subsetMissions[0]);
          }
          continue;
        }

        subsetPlans.set(mask, {
          totalSCU,
          plan: exactPlan,
          missions: subsetMissions.map((mission) => ({
            ...mission,
            boxes: [...(mission.boxes ?? [])],
            boxSummary: countBoxes(mission.boxes ?? [])
          })),
          stops: subsetMissions.length
        });
      }

      if (singleMissionIssues.length) {
        return {
          reachable: false,
          ship: normalizedShip,
          maxBoxSize: normalizedMaxBoxSize,
          boxSizes: normalizedBoxSizes,
          ...manifest,
          reason: "single-mission-unreachable",
          blockingMissions: singleMissionIssues
        };
      }

      const validMasks = [...subsetPlans.keys()];
      const bestStates = Array.from({ length: fullMask + 1 }, () => null);
      bestStates[0] = {
        flights: 0,
        prevMask: null,
        subsetMask: 0,
        loadProfile: [],
        stopProfile: []
      };

      for (let mask = 0; mask <= fullMask; mask += 1) {
        const current = bestStates[mask];
        if (!current) {
          continue;
        }

        for (const subsetMask of validMasks) {
          if ((mask & subsetMask) !== 0) {
            continue;
          }

          const nextMask = mask | subsetMask;
          const subset = subsetPlans.get(subsetMask);
          const candidate = {
            flights: current.flights + 1,
            prevMask: mask,
            subsetMask,
            loadProfile: buildSortedProfile(current.loadProfile, subset.totalSCU),
            stopProfile: buildSortedProfile(current.stopProfile, subset.stops, ASCENDING)
          };

          if (isBetterManifestState(candidate, bestStates[nextMask])) {
            bestStates[nextMask] = candidate;
          }
        }
      }

      const finalState = bestStates[fullMask];
      if (!finalState) {
        return {
          reachable: false,
          ship: normalizedShip,
          boxSizes: normalizedBoxSizes,
          ...manifest,
          reason: "manifest-unreachable"
        };
      }

      let cursorMask = fullMask;

      while (cursorMask > 0) {
        const state = bestStates[cursorMask];
        selectedFlights.push(subsetPlans.get(state.subsetMask));
        cursorMask = state.prevMask;
      }
    }

    selectedFlights = [...dedicatedFlights, ...selectedFlights];
    selectedFlights.sort((left, right) => right.totalSCU - left.totalSCU);
    const flights = selectedFlights.map((flight, index) => {
      const missionBoxes = flight.missions.length === 1 && !flight.missions[0].boxes
        ? [{ ...flight.missions[0], boxes: [...flight.plan.boxes] }]
        : flight.missions;

      return {
        number: index + 1,
        total: flight.plan.total,
        boxes: [...flight.plan.boxes],
        boxCount: flight.plan.boxCount,
        slotAssignments: flight.plan.slotAssignments.map((slot) => ({
          slotIndex: slot.slotIndex,
          capacity: slot.capacity,
          used: slot.used,
          free: slot.free,
          boxes: [...slot.boxes]
        })),
        missions: missionBoxes.map((mission) => ({
          id: mission.id,
          label: mission.label,
          cargo: mission.cargo,
          source: mission.source,
          destination: mission.destination,
          remainingSCU: mission.remainingSCU,
          boxes: [...(mission.boxes ?? [])],
          boxSummary: countBoxes(mission.boxes ?? [])
        }))
      };
    });

    return {
      reachable: true,
      ship: normalizedShip,
      maxBoxSize: normalizedMaxBoxSize,
      boxSizes: normalizedBoxSizes,
      ...manifest,
      flightsRequired: flights.length,
      flights,
      aggregateBoxes: countBoxes(flights.flatMap((flight) => flight.boxes))
    };
  }

  const LARGE_SINGLE_EXAMPLE = {
    id: "large-single",
    labelKey: "example.largeSingle",
    presetId: "argo-raft",
    cargoLiftMaxBoxSize: "16",
    source: "Baijini-Point oberhalb von ArcCorp",
    cargoName: "Processed Food",
    missions: [
      { id: "mission-food", cargoName: "Processed Food", destination: "Everus Harbor oberhalb von Hurston", totalSCU: 1723, deliveredSCU: 0 }
    ]
  };

  const SAME_CARGO_MULTI_DESTINATION_EXAMPLE = {
    id: "same-cargo-multi-stop",
    labelKey: "example.sameCargoMultiStop",
    presetId: "argo-raft",
    cargoLiftMaxBoxSize: "16",
    source: "MIC-L1 Shallow Frontier Station",
    cargoName: "Quartz",
    missions: [
      { id: "mission-1", cargoName: "Quartz", destination: "Everus Harbor oberhalb von Hurston", totalSCU: 124, deliveredSCU: 0 },
      { id: "mission-2", cargoName: "Quartz", destination: "Seraphim-Station oberhalb von Crusader", totalSCU: 93, deliveredSCU: 0 },
      { id: "mission-3", cargoName: "Quartz", destination: "Baijini-Point oberhalb von ArcCorp", totalSCU: 84, deliveredSCU: 0 }
    ]
  };

  const MIXED_CARGO_SHARED_DESTINATION_EXAMPLE = {
    id: "mixed-cargo-shared-destination",
    labelKey: "example.mixedCargoSharedDestination",
    presetId: "argo-raft",
    cargoLiftMaxBoxSize: "16",
    source: "Everus Harbor oberhalb von Hurston",
    cargoName: "",
    missions: [
      { id: "mission-1", cargoName: "Hydrogen Fuel", destination: "Melodic Fields-Station am L4-Lagrangepunkt von Hurston", totalSCU: 60, deliveredSCU: 0 },
      { id: "mission-2", cargoName: "Quantum Fuel", destination: "High Course-Station am L5-Lagrangepunkt von Hurston", totalSCU: 136, deliveredSCU: 0 },
      { id: "mission-3", cargoName: "Hydrogen Fuel", destination: "Thundering Express-Station am L3-Lagrangepunkt von Hurston", totalSCU: 70, deliveredSCU: 0 },
      { id: "mission-4", cargoName: "Ship Ammunition", destination: "Thundering Express-Station am L3-Lagrangepunkt von Hurston", totalSCU: 67, deliveredSCU: 0 }
    ]
  };

  const RAFT_THREE_SMALL_ONE_FULL_EXAMPLE = {
    id: "raft-three-small-one-full",
    labelKey: "example.raftThreeSmallOneFull",
    presetId: "argo-raft",
    cargoLiftMaxBoxSize: "16",
    source: "MIC-L1 Shallow Frontier Station",
    cargoName: "Quartz",
    missions: [
      { id: "mission-small-1", cargoName: "Quartz", destination: "Seraphim-Station oberhalb von Crusader", totalSCU: 48, deliveredSCU: 0 },
      { id: "mission-small-2", cargoName: "Quartz", destination: "Baijini-Point oberhalb von ArcCorp", totalSCU: 32, deliveredSCU: 0 },
      { id: "mission-small-3", cargoName: "Quartz", destination: "Everus Harbor oberhalb von Hurston", totalSCU: 32, deliveredSCU: 0 },
      { id: "mission-full-1", cargoName: "Quartz", destination: "Pyro Gateway oberhalb von Stanton", totalSCU: 176, deliveredSCU: 0 }
    ]
  };

  const SMALL_SHIP_BLOCKED_EXAMPLE = {
    id: "small-ship-blocked",
    labelKey: "example.smallShipBlocked",
    presetId: "aegis-avenger-titan",
    cargoLiftMaxBoxSize: "16",
    source: "Everus Harbor oberhalb von Hurston",
    cargoName: "Quantum Fuel",
    missions: [
      { id: "mission-small-1", cargoName: "Quantum Fuel", destination: "Port Tressler oberhalb von microTech", totalSCU: 16, deliveredSCU: 0 }
    ]
  };

  const EXAMPLE_SCENARIOS = [
    LARGE_SINGLE_EXAMPLE,
    SAME_CARGO_MULTI_DESTINATION_EXAMPLE,
    MIXED_CARGO_SHARED_DESTINATION_EXAMPLE,
    RAFT_THREE_SMALL_ONE_FULL_EXAMPLE,
    SMALL_SHIP_BLOCKED_EXAMPLE
  ];
  const DEFAULT_EXAMPLE = EXAMPLE_SCENARIOS[0];

  const form = document.querySelector("#planner-form");
  const languageSelect = document.querySelector("#ui-language");
  const shipSearchInput = document.querySelector("#ship-search");
  const presetSelect = document.querySelector("#ship-preset");
  const exampleScenarioSelect = document.querySelector("#example-scenario");
  const cargoLiftMaxBoxSizeSelect = document.querySelector("#cargo-lift-max-box-size");
  const shipHint = document.querySelector("#ship-hint");
  const missionList = document.querySelector("#mission-list");
  const resultSummary = document.querySelector("#result-summary");
  const resultFlights = document.querySelector("#result-flights");
  const resultAlternative = document.querySelector("#result-alternative");
  const shareStatus = document.querySelector("#share-status");
  const buildFooter = document.querySelector("#build-footer");
  let lastRenderedPlan = null;

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function formatInteger(value) {
    return formatter.format(Math.trunc(value));
  }

  function populateLanguageOptions() {
    const previousValue = languageSelect.value;
    languageSelect.innerHTML = SUPPORTED_LANGUAGES
      .map((language) => `<option value="${language}">${escapeHtml(t(`language.option.${language}`))}</option>`)
      .join("");
    languageSelect.value = normalizeLanguage(previousValue || currentLanguage);
  }

  function applyStaticTranslations() {
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = t(element.dataset.i18n);
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
    });

    const noLimitOption = cargoLiftMaxBoxSizeSelect.querySelector('option[value=""]');
    if (noLimitOption) {
      noLimitOption.textContent = t("option.noLimit");
    }
  }

  function getLocalizedShipSearchText(preset) {
    return `${preset.name} ${translateShipGroup(preset.group)} ${translateShipNote(preset)}`.toLowerCase();
  }

  function renderBuildFooter() {
    const version = BUILD_INFO.version;
    const repositoryUrl = getSafeRepositoryUrl(BUILD_INFO.repositoryUrl);
    const repositoryLabel = BUILD_INFO.repositoryLabel || deriveRepositoryLabel(repositoryUrl);

    if (!version && !repositoryUrl) {
      buildFooter.hidden = true;
      buildFooter.innerHTML = "";
      return;
    }

    const parts = [];

    if (version) {
      parts.push(`
        <span class="app-footer__item">
          <strong>${escapeHtml(t("footer.version"))}</strong>
          <span>${escapeHtml(version)}</span>
        </span>
      `);
    }

    if (repositoryUrl) {
      parts.push(`
        <span class="app-footer__item">
          <strong>${escapeHtml(t("footer.repository"))}</strong>
          <a href="${escapeHtml(repositoryUrl)}" target="_blank" rel="noreferrer">${escapeHtml(repositoryLabel)}</a>
        </span>
      `);
    }

    buildFooter.innerHTML = `<div class="app-footer__inner">${parts.join("")}</div>`;
    buildFooter.hidden = false;
  }

  function populatePresetOptions(searchQuery = "", preferredPresetId = presetSelect.value) {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const visiblePresets = normalizedQuery
      ? SHIP_PRESETS.filter((preset) => getLocalizedShipSearchText(preset).includes(normalizedQuery))
      : SHIP_PRESETS;

    if (!visiblePresets.length) {
      presetSelect.innerHTML = `<option value="">${escapeHtml(t("ship.noResults"))}</option>`;
      presetSelect.disabled = true;
      return null;
    }

    const groupedPresets = visiblePresets.reduce((groups, preset) => {
      const group = translateShipGroup(preset.group || "Sonstige");
      if (!groups.has(group)) {
        groups.set(group, []);
      }
      groups.get(group).push(preset);
      return groups;
    }, new Map());

    presetSelect.innerHTML = [...groupedPresets.entries()]
      .map(([group, presets]) => `
        <optgroup label="${escapeHtml(group)}">
          ${presets.map((preset) => `<option value="${preset.id}">${escapeHtml(preset.name)}</option>`).join("")}
        </optgroup>
      `)
      .join("");

    presetSelect.disabled = false;
    const nextPresetId = visiblePresets.some((preset) => preset.id === preferredPresetId)
      ? preferredPresetId
      : visiblePresets[0].id;
    presetSelect.value = nextPresetId;
    return nextPresetId;
  }

  function populateExampleOptions() {
    exampleScenarioSelect.innerHTML = EXAMPLE_SCENARIOS
      .map((example) => `<option value="${example.id}">${escapeHtml(t(example.labelKey))}</option>`)
      .join("");
  }

  function getExampleScenarioById(exampleId) {
    return EXAMPLE_SCENARIOS.find((example) => example.id === exampleId) ?? DEFAULT_EXAMPLE;
  }

  function getCargoLiftMaxBoxSize() {
    return normalizeMaxBoxSize(cargoLiftMaxBoxSizeSelect.value);
  }

  function getSelectedBoxSizes() {
    return constrainBoxSizes(DEFAULT_BOX_SIZES, getCargoLiftMaxBoxSize());
  }

  function createMissionDraft(row = {}) {
    return {
      id: row.id ?? `mission-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      cargoName: row.cargoName ?? "",
      destination: row.destination ?? "",
      totalSCU: row.totalSCU ?? "",
      deliveredSCU: row.deliveredSCU ?? ""
    };
  }

  function resolveMissionCargo(rowCargoName, defaultCargoName) {
    return rowCargoName.trim() || defaultCargoName.trim();
  }

  function renderMissionRows(rows) {
    missionList.innerHTML = rows
      .map((row, index) => {
        const totalSCU = Number(row.totalSCU) || 0;
        const deliveredSCU = Number(row.deliveredSCU) || 0;
        const remainingSCU = Math.max(0, totalSCU - deliveredSCU);

        return `
          <article class="mission-row" data-mission-id="${escapeHtml(row.id)}">
            <div class="mission-row__grid">
              <label>
                <span>${escapeHtml(t("mission.destinationLabel", { index: index + 1 }))}</span>
                <input type="text" name="mission-destination" value="${escapeHtml(row.destination)}" placeholder="${escapeHtml(t("placeholder.destination"))}">
              </label>
              <label>
                <span>${escapeHtml(t("mission.cargoLabel"))}</span>
                <input type="text" name="mission-cargo" value="${escapeHtml(row.cargoName)}" placeholder="${escapeHtml(t("placeholder.cargo"))}">
              </label>
              <label>
                <span>${escapeHtml(t("mission.totalLabel"))}</span>
                <input type="number" name="mission-total" min="1" step="1" value="${escapeHtml(row.totalSCU)}" placeholder="${escapeHtml(t("placeholder.total"))}">
              </label>
              <label>
                <span>${escapeHtml(t("mission.deliveredLabel"))}</span>
                <input type="number" name="mission-delivered" min="0" step="1" value="${escapeHtml(row.deliveredSCU)}" placeholder="${escapeHtml(t("placeholder.delivered"))}">
              </label>
              <div class="mission-row__meta">
                <span>${escapeHtml(t("mission.remainingLabel"))}</span>
                <strong data-role="remaining">${formatInteger(remainingSCU)} SCU</strong>
              </div>
            </div>
            <div class="mission-row__actions">
              <button type="button" class="button button--ghost mission-row__remove" data-action="remove-mission">${escapeHtml(t("action.removeMission"))}</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function readMissionRowsFromDom() {
    return [...missionList.querySelectorAll(".mission-row")].map((row) => ({
      id: row.dataset.missionId,
      cargoName: row.querySelector('input[name="mission-cargo"]').value.trim(),
      destination: row.querySelector('input[name="mission-destination"]').value.trim(),
      totalSCU: row.querySelector('input[name="mission-total"]').value,
      deliveredSCU: row.querySelector('input[name="mission-delivered"]').value
    }));
  }

  function updateMissionRowMeta(rowElement) {
    const totalInput = rowElement.querySelector('input[name="mission-total"]');
    const deliveredInput = rowElement.querySelector('input[name="mission-delivered"]');
    const remainingElement = rowElement.querySelector('[data-role="remaining"]');
    const totalSCU = Math.max(0, Number.parseInt(totalInput.value || "0", 10) || 0);
    const deliveredSCU = Math.max(0, Number.parseInt(deliveredInput.value || "0", 10) || 0);
    const remainingSCU = Math.max(0, totalSCU - deliveredSCU);
    remainingElement.textContent = `${formatInteger(remainingSCU)} SCU`;
  }

  function applyPreset(presetId, keepMissionData = true) {
    const preset = getShipPresetById(presetId);
    const savedMissionData = keepMissionData ? {
      source: form.elements.source.value,
      cargoName: form.elements.cargoName.value
    } : null;

    presetSelect.value = preset.id;
    shipHint.dataset.baseNote = preset.note ?? "";
    shipHint.dataset.baseNoteKey = preset.noteKey ?? "";
    shipHint.textContent = translateShipNote(preset);

    if (savedMissionData) {
      form.elements.source.value = savedMissionData.source;
      form.elements.cargoName.value = savedMissionData.cargoName;
    }
  }

  function parseSlotCapacities(input) {
    return input
      .split(",")
      .flatMap((part) => {
        const trimmed = part.trim();
        if (!trimmed) {
          return [];
        }

        const groupedMatch = trimmed.match(/^(\d+)\s*x\s*(\d+)(?:\s*scu)?$/iu);
        if (groupedMatch) {
          const count = Number.parseInt(groupedMatch[1], 10);
          const capacity = Number.parseInt(groupedMatch[2], 10);
          if (count > 0 && capacity > 0) {
            return repeatSlots(capacity, count);
          }
        }

        const value = Number.parseInt(trimmed.replace(/\s*scu$/iu, ""), 10);
        return Number.isFinite(value) && value > 0 ? [value] : [];
      });
  }

  function collectMissionInput() {
    if (presetSelect.disabled || !presetSelect.value) {
      throw new Error(t("errors.needShip"));
    }

    const selectedPreset = getShipPresetById(presetSelect.value);
    const source = form.elements.source.value.trim();
    const cargoName = form.elements.cargoName.value.trim();
    const missionRows = readMissionRowsFromDom();
    const cargoLiftMaxBoxSize = getCargoLiftMaxBoxSize();

    const missions = missionRows
      .filter((row) => row.destination || row.cargoName || row.totalSCU || row.deliveredSCU)
      .map((row, index) => ({
        id: row.id,
        label: row.destination || t("mission.label", { index: index + 1 }),
        source,
        destination: row.destination,
        cargo: resolveMissionCargo(row.cargoName, cargoName),
        totalSCU: Number.parseInt(row.totalSCU, 10),
        deliveredSCU: Number.parseInt(row.deliveredSCU || "0", 10) || 0
      }));

    return {
      presetId: selectedPreset.id,
      ship: selectedPreset,
      cargoLiftMaxBoxSize,
      cargoName,
      source,
      missions,
      boxSizes: getSelectedBoxSizes()
    };
  }

  function saveState(snapshot) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function sanitizeShareState(state) {
    return {
      language: normalizeLanguage(state?.language),
      presetId: state?.presetId ?? "",
      cargoLiftMaxBoxSize: state?.cargoLiftMaxBoxSize ?? "",
      source: state?.source ?? "",
      cargoName: state?.cargoName ?? "",
      missions: Array.isArray(state?.missions)
        ? state.missions.map((mission) => ({
          id: mission?.id ?? "",
          cargoName: mission?.cargoName ?? "",
          destination: mission?.destination ?? "",
          totalSCU: mission?.totalSCU ?? "",
          deliveredSCU: mission?.deliveredSCU ?? 0
        }))
        : []
    };
  }

  function encodeBase64Url(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";

    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }

    return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
  }

  function decodeBase64Url(value) {
    const base64 = value
      .replaceAll("-", "+")
      .replaceAll("_", "/")
      .padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function encodeShareState(state) {
    return encodeBase64Url(JSON.stringify({
      version: 1,
      state: sanitizeShareState(state)
    }));
  }

  function decodeShareState(encoded) {
    try {
      const payload = JSON.parse(decodeBase64Url(encoded));
      if (payload?.version !== 1 || typeof payload?.state !== "object" || !payload.state) {
        return null;
      }

      return sanitizeShareState(payload.state);
    } catch {
      return null;
    }
  }

  function buildShareUrl(baseUrl, state) {
    const url = new URL(baseUrl);
    url.hash = `share=${encodeShareState(state)}`;
    return url.toString();
  }

  function readShareStateFromCurrentUrl() {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
    const params = new URLSearchParams(hash);
    const encoded = params.get("share");
    return encoded ? decodeShareState(encoded) : null;
  }

  function setShareStatus(message) {
    shareStatus.textContent = message;
  }

  function applyFlightDeliveryToRows(missionRows, flightMissions) {
    const increments = new Map();

    for (const flightMission of flightMissions) {
      const missionId = flightMission?.id;
      const amount = Math.max(0, Math.trunc(Number(flightMission?.remainingSCU ?? 0)));

      if (!missionId || amount <= 0) {
        continue;
      }

      increments.set(missionId, (increments.get(missionId) ?? 0) + amount);
    }

    return missionRows.map((row) => {
      const totalSCU = Math.max(0, Number.parseInt(row.totalSCU || "0", 10) || 0);
      const deliveredSCU = Math.max(0, Number.parseInt(row.deliveredSCU || "0", 10) || 0);
      const increment = increments.get(row.id) ?? 0;

      return {
        ...row,
        deliveredSCU: Math.min(totalSCU, deliveredSCU + increment)
      };
    });
  }

  function renderShipMeta(ship) {
    const baseNoteKey = shipHint.dataset.baseNoteKey?.trim() || ship.noteKey;
    const baseNote = baseNoteKey ? t(baseNoteKey) : shipHint.dataset.baseNote?.trim() || ship.note;
    const details = t("ship.meta.slots", { slots: describeSlotCapacities(ship.slotCapacities) });
    shipHint.textContent = baseNote ? `${baseNote} ${details}` : details;
  }

  function renderError(message, details = "") {
    lastRenderedPlan = null;
    resultSummary.innerHTML = `
      <article class="result-card result-card--alert">
        <h2>${escapeHtml(t("result.errorTitle"))}</h2>
        <p>${escapeHtml(message)}</p>
        ${details ? `<p>${escapeHtml(details)}</p>` : ""}
      </article>
    `;
    resultFlights.innerHTML = "";
  }

  function renderCompletedMissions(manifest, source, cargoName) {
    const sections = [];
    const cargoLiftMaxBoxSize = normalizeMaxBoxSize(manifest.maxBoxSize);

    if (manifest.completedMissions.length) {
      sections.push(`
        <article class="result-card">
          <h2>${escapeHtml(t("result.completedTitle"))}</h2>
          <ul class="manifest-list">
            ${manifest.completedMissions.map((mission) => `
              <li>
                <strong>${escapeHtml(mission.destination)}</strong>
                <span>${escapeHtml(t("result.completedMission.status", { scu: formatInteger(mission.totalSCU) }))}</span>
                <span>${escapeHtml(t("result.completedMission.detail", {
                  cargo: mission.cargo || cargoName || t("result.cargoFallback"),
                  source: source || mission.source || t("result.routePickupOpen")
                }))}</span>
              </li>
            `).join("")}
          </ul>
        </article>
      `);
    }

    sections.push(`
      <article class="result-card">
        <h2>${escapeHtml(t("result.activeBoxesTitle"))}</h2>
        <p>${escapeHtml(formatBoxSummary(manifest.aggregateBoxes))}</p>
        <p>${escapeHtml(cargoLiftMaxBoxSize == null
          ? t("result.liftLimit.none")
          : t("result.liftLimit.value", { size: cargoLiftMaxBoxSize }))}</p>
      </article>
    `);

    resultAlternative.innerHTML = sections.join("");
  }

  function summarizeCargoTypes(missions, fallbackCargo = "") {
    const cargoTypes = [...new Set(
      missions
        .map((mission) => mission.cargo?.trim())
        .filter(Boolean)
    )];

    if (!cargoTypes.length) {
      return fallbackCargo || t("result.cargoFallback");
    }

    if (cargoTypes.length <= 3) {
      return cargoTypes.join(", ");
    }

    return t("result.cargoTypes.many", { count: cargoTypes.length });
  }

  function groupFlightLoadsByCargo(missions, fallbackCargo = "") {
    const groups = new Map();

    for (const mission of missions) {
      const cargo = mission.cargo?.trim() || fallbackCargo || t("result.cargoFallback");
      if (!groups.has(cargo)) {
        groups.set(cargo, {
          label: cargo,
          totalSCU: 0,
          boxes: [],
          destinations: new Set()
        });
      }

      const group = groups.get(cargo);
      group.totalSCU += mission.remainingSCU;
      group.boxes.push(...(mission.boxes ?? []));
      group.destinations.add(mission.destination || t("result.destinationOpen"));
    }

    return [...groups.values()]
      .map((group) => ({
        ...group,
        boxSummary: countBoxes(group.boxes),
        meta: t(
          group.destinations.size === 1 ? "result.flightTask.stopCount.one" : "result.flightTask.stopCount.other",
          { count: group.destinations.size }
        )
      }))
      .sort((left, right) => right.totalSCU - left.totalSCU);
  }

  function groupFlightDropsByDestination(missions, fallbackCargo = "") {
    const groups = new Map();

    for (const mission of missions) {
      const destination = mission.destination?.trim() || t("result.destinationOpen");
      if (!groups.has(destination)) {
        groups.set(destination, {
          label: destination,
          totalSCU: 0,
          boxes: [],
          cargoTypes: new Set()
        });
      }

      const group = groups.get(destination);
      group.totalSCU += mission.remainingSCU;
      group.boxes.push(...(mission.boxes ?? []));
      group.cargoTypes.add(mission.cargo?.trim() || fallbackCargo || t("result.cargoFallback"));
    }

    return [...groups.values()]
      .map((group) => ({
        ...group,
        boxSummary: countBoxes(group.boxes),
        meta: [...group.cargoTypes].join(", ")
      }))
      .sort((left, right) => right.totalSCU - left.totalSCU);
  }

  function renderFlightTaskList(title, groups) {
    return `
      <section class="flight-task-group">
        <h4>${escapeHtml(title)}</h4>
        <ul class="flight-task-list">
          ${groups.map((group) => `
            <li>
          <strong>${escapeHtml(group.label)}</strong>
          <span>${formatInteger(group.totalSCU)} SCU · ${escapeHtml(formatBoxSummary(group.boxSummary))}</span>
          <span>${escapeHtml(group.meta)}</span>
            </li>
          `).join("")}
        </ul>
      </section>
    `;
  }

  function renderFlightCard(flight, cargoName, source) {
    const loadGroups = groupFlightLoadsByCargo(flight.missions, cargoName);
    const dropGroups = groupFlightDropsByDestination(flight.missions, cargoName);
    const slotList = flight.slotAssignments
      .filter((slot) => slot.used > 0)
      .map((slot) => `
        <li>
          <strong>${escapeHtml(t("result.flight.slot", { index: slot.slotIndex }))}</strong>
          <span>${formatInteger(slot.used)} / ${formatInteger(slot.capacity)} SCU</span>
          <span>${escapeHtml(formatBoxSummary(slot.boxes))}</span>
        </li>
      `)
      .join("");

    return `
      <article class="flight-card">
        <header>
          <p class="flight-index">${escapeHtml(t("result.flight.title", { number: flight.number }))}</p>
          <h3>${formatInteger(flight.total)} SCU</h3>
        </header>
        <p class="flight-boxes">${escapeHtml(t("result.flight.pickupLine", {
          pickup: source || flight.missions[0]?.source || t("result.routePickupOpen"),
          boxes: formatBoxSummary(flight.boxes)
        }))}</p>
        ${renderFlightTaskList(t("result.flightTask.load"), loadGroups)}
        ${renderFlightTaskList(t("result.flightTask.drop"), dropGroups)}
        <details class="slot-details">
          <summary>${escapeHtml(t("result.slotDetails"))}</summary>
          <ul class="slot-list slot-list--compact">${slotList}</ul>
        </details>
        <div class="flight-actions">
          <button type="button" class="button button--primary flight-apply" data-action="apply-flight" data-flight-index="${flight.number - 1}">
            ${escapeHtml(t("action.applyFlight"))}
          </button>
        </div>
      </article>
    `;
  }

  function renderManifestPlan(plan, source, cargoName) {
    lastRenderedPlan = plan;
    const activeDestinations = plan.activeMissions.length;
    const completedDestinations = plan.completedMissions.length;
    const cargoSummary = summarizeCargoTypes(plan.activeMissions, cargoName);
    const cargoLiftMaxBoxSize = normalizeMaxBoxSize(plan.maxBoxSize);

    resultSummary.innerHTML = `
      <article class="result-card">
        <div class="mission-strip">
          <span class="route-pill">${escapeHtml(source || t("result.routePickupOpen"))}</span>
          <span class="route-pill route-pill--accent">${escapeHtml(plan.ship.name)}</span>
        </div>
        <h2>${escapeHtml(t("result.manifestTitle"))}</h2>
        <p>${escapeHtml(t("result.remainingSummary", {
          cargo: cargoSummary,
          remaining: formatInteger(plan.remainingSCU),
          destinations: formatInteger(activeDestinations)
        }))}</p>
        <div class="metric-grid">
          <div>
            <span>${escapeHtml(t("result.metric.flights"))}</span>
            <strong>${formatInteger(plan.flightsRequired)}</strong>
          </div>
          <div>
            <span>${escapeHtml(t("result.metric.remaining"))}</span>
            <strong>${formatInteger(plan.remainingSCU)} SCU</strong>
          </div>
          <div>
            <span>${escapeHtml(t("result.metric.activeDestinations"))}</span>
            <strong>${formatInteger(activeDestinations)}</strong>
          </div>
          <div>
            <span>${escapeHtml(t("result.metric.completed"))}</span>
            <strong>${formatInteger(completedDestinations)}</strong>
          </div>
        </div>
        <p class="aggregate-boxes">${escapeHtml(t("result.aggregateLoad", { boxes: formatBoxSummary(plan.aggregateBoxes) }))}</p>
        <p>${escapeHtml(cargoLiftMaxBoxSize == null
          ? t("result.liftLimit.none")
          : t("result.liftLimit.value", { size: cargoLiftMaxBoxSize }))}</p>
      </article>
    `;

    resultFlights.innerHTML = plan.flights
      .map((flight) => renderFlightCard(flight, cargoName, source))
      .join("");

    renderCompletedMissions(plan, source, cargoName);
  }

  function renderBlockedManifest(plan) {
    const liftTooLargeHint = plan.reason === "max-box-size-too-large"
      ? t("result.blocked.liftTooLarge", {
        liftSize: formatInteger(plan.maxBoxSize),
        shipSize: formatInteger(plan.maxLoadableContainerSize)
      })
      : "";
    const blockingList = plan.blockingMissions?.length
      ? plan.blockingMissions.map((mission) => `${mission.destination}: ${formatInteger(mission.remainingSCU)} SCU`).join(", ")
      : t("result.blocked.listFallback");

    renderError(
      t("result.blocked.generic"),
      liftTooLargeHint ? `${liftTooLargeHint} ${blockingList}` : blockingList
    );
    renderCompletedMissions(plan, plan.missions[0]?.source ?? "", plan.missions[0]?.cargo ?? "");
  }

  function renderFinishedManifest(plan, source, cargoName) {
    lastRenderedPlan = plan;
    const cargoSummary = summarizeCargoTypes(plan.completedMissions, cargoName);
    resultSummary.innerHTML = `
      <article class="result-card">
        <h2>${escapeHtml(t("result.finishedTitle"))}</h2>
        <p>${escapeHtml(t("result.finishedText", {
          cargo: cargoSummary,
          source: source || t("result.routePickupOpen")
        }))}</p>
      </article>
    `;
    resultFlights.innerHTML = "";
    renderCompletedMissions(plan, source, cargoName);
  }

  function calculateAndRender() {
    try {
      const snapshot = collectMissionInput();
      const normalizedShip = normalizeShip(snapshot.ship);
      renderShipMeta(normalizedShip);

      if (!snapshot.missions.length) {
        throw new Error(t("errors.needMission"));
      }

      if (!snapshot.boxSizes.length) {
        throw new Error(t("errors.needBoxSize"));
      }

      const plan = planMissionManifest({
        ship: normalizedShip,
        boxSizes: snapshot.boxSizes,
        maxBoxSize: snapshot.cargoLiftMaxBoxSize,
        missions: snapshot.missions
      });

      if (!plan.reachable) {
        renderBlockedManifest(plan);
      } else if (plan.flightsRequired === 0) {
        renderFinishedManifest(plan, snapshot.source, snapshot.cargoName);
      } else {
        renderManifestPlan(plan, snapshot.source, snapshot.cargoName);
      }
    } catch (error) {
      renderError(error instanceof Error ? error.message : t("errors.unknown"));
      resultAlternative.innerHTML = "";
    }

    saveState(buildCurrentStateSnapshot());
  }

  function buildCurrentStateSnapshot() {
    return {
      language: currentLanguage,
      presetId: presetSelect.value,
      cargoLiftMaxBoxSize: cargoLiftMaxBoxSizeSelect.value,
      source: form.elements.source.value,
      cargoName: form.elements.cargoName.value,
      missions: readMissionRowsFromDom()
    };
  }

  function applyExampleState(example) {
    exampleScenarioSelect.value = example.id;
    shipSearchInput.value = "";
    populatePresetOptions("", example.presetId);
    applyPreset(example.presetId, false);
    cargoLiftMaxBoxSizeSelect.value = example.cargoLiftMaxBoxSize ?? "";
    form.elements.source.value = example.source;
    form.elements.cargoName.value = example.cargoName;
    renderMissionRows(example.missions.map(createMissionDraft));
  }

  function rerenderLocalizedUi() {
    const currentRows = missionList.children.length ? readMissionRowsFromDom() : [createMissionDraft()];
    const currentExampleId = exampleScenarioSelect.value || DEFAULT_EXAMPLE.id;
    const currentPresetId = presetSelect.value || DEFAULT_EXAMPLE.presetId;
    const currentSearch = shipSearchInput.value;

    populateLanguageOptions();
    applyStaticTranslations();
    renderBuildFooter();
    populateExampleOptions();
    exampleScenarioSelect.value = currentExampleId;
    const searchPresetId = populatePresetOptions(currentSearch, currentPresetId);
    const nextPresetId = searchPresetId ?? populatePresetOptions("", currentPresetId);
    if (!nextPresetId) {
      shipSearchInput.value = "";
      return;
    }

    if (searchPresetId == null) {
      shipSearchInput.value = "";
    }

    applyPreset(nextPresetId);
    renderMissionRows(currentRows.map(createMissionDraft));
    setShareStatus("");
  }

  function hydrateFromSavedState(initialState) {
    if (!initialState) {
      applyExampleState(DEFAULT_EXAMPLE);
      return;
    }

    exampleScenarioSelect.value = DEFAULT_EXAMPLE.id;
    shipSearchInput.value = "";
    populatePresetOptions("", initialState.presetId ?? DEFAULT_EXAMPLE.presetId);
    applyPreset(initialState.presetId ?? DEFAULT_EXAMPLE.presetId, false);

    cargoLiftMaxBoxSizeSelect.value = initialState.cargoLiftMaxBoxSize ?? "";
    form.elements.source.value = initialState.source ?? DEFAULT_EXAMPLE.source;
    form.elements.cargoName.value = initialState.cargoName ?? DEFAULT_EXAMPLE.cargoName;
    renderMissionRows((initialState.missions?.length ? initialState.missions : DEFAULT_EXAMPLE.missions).map(createMissionDraft));
  }

  async function copyShareLink() {
    const shareUrl = buildShareUrl(window.location.href, buildCurrentStateSnapshot());
    window.history.replaceState(null, "", shareUrl);

    let copied = false;

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        copied = true;
      } catch {
        copied = false;
      }
    }

    if (!copied) {
      const textarea = document.createElement("textarea");
      textarea.value = shareUrl;
      textarea.setAttribute("readonly", "");
      textarea.className = "copy-buffer";
      document.body.append(textarea);
      textarea.select();

      try {
        copied = document.execCommand("copy");
      } catch {
        copied = false;
      }

      textarea.remove();
    }

    setShareStatus(copied
      ? t("share.copied")
      : t("share.updated"));
  }

  const initialState = readShareStateFromCurrentUrl() ?? loadState();
  setLanguage(initialState?.language ?? DEFAULT_LANGUAGE);
  populateLanguageOptions();
  applyStaticTranslations();
  renderBuildFooter();
  populatePresetOptions();
  populateExampleOptions();
  hydrateFromSavedState(initialState);
  calculateAndRender();

  languageSelect.addEventListener("change", () => {
    setLanguage(languageSelect.value);
    rerenderLocalizedUi();
    calculateAndRender();
  });

  shipSearchInput.addEventListener("input", () => {
    const nextPresetId = populatePresetOptions(shipSearchInput.value, presetSelect.value);
    if (!nextPresetId) {
      return;
    }

    applyPreset(nextPresetId);
  });

  presetSelect.addEventListener("change", () => {
    applyPreset(presetSelect.value);
    calculateAndRender();
  });

  document.querySelector("#share-link").addEventListener("click", () => {
    copyShareLink();
  });

  document.querySelector("#add-mission").addEventListener("click", () => {
    const rows = readMissionRowsFromDom();
    rows.push(createMissionDraft());
    renderMissionRows(rows);
    calculateAndRender();
  });

  document.querySelector("#clear-source").addEventListener("click", () => {
    form.elements.source.value = "";
    form.elements.cargoName.value = "";
    calculateAndRender();
  });

  document.querySelector("#clear-destinations").addEventListener("click", () => {
    renderMissionRows([createMissionDraft()]);
    lastRenderedPlan = null;
    resultSummary.innerHTML = "";
    resultFlights.innerHTML = "";
    resultAlternative.innerHTML = "";
    saveState(buildCurrentStateSnapshot());
  });

  document.querySelector("#load-example").addEventListener("click", () => {
    applyExampleState(getExampleScenarioById(exampleScenarioSelect.value));
    calculateAndRender();
  });

  cargoLiftMaxBoxSizeSelect.addEventListener("change", () => {
    calculateAndRender();
  });

  resultFlights.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }

    if (target.dataset.action !== "apply-flight") {
      return;
    }

    const flightIndex = Number.parseInt(target.dataset.flightIndex || "", 10);
    const flight = lastRenderedPlan?.flights?.[flightIndex];
    if (!flight) {
      return;
    }

    const updatedRows = applyFlightDeliveryToRows(readMissionRowsFromDom(), flight.missions);
    renderMissionRows(updatedRows);
    calculateAndRender();
  });

  missionList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }

    if (target.dataset.action !== "remove-mission") {
      return;
    }

    const rows = readMissionRowsFromDom();
    const rowElement = target.closest(".mission-row");
    const filtered = rows.filter((row) => row.id !== rowElement?.dataset.missionId);
    renderMissionRows(filtered.length ? filtered : [createMissionDraft()]);
    calculateAndRender();
  });

  missionList.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const rowElement = target.closest(".mission-row");
    if (rowElement) {
      updateMissionRowMeta(rowElement);
    }

    calculateAndRender();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    calculateAndRender();
  });

  form.addEventListener("input", (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) {
      if (event.target === shipSearchInput) {
        return;
      }

      if (!event.target.closest(".mission-row")) {
        calculateAndRender();
      }
    }
  });

  form.addEventListener("change", (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) {
      if (event.target === shipSearchInput) {
        return;
      }

      calculateAndRender();
    }
  });
}());
