import assert from "node:assert/strict";
import test from "node:test";
import { DemoDataCenterRepository } from "../src/data/demo/repository";
import { demoFacilities } from "../src/data/demo/facilities";
import { hasValidCoordinates, type DataCenterFilters } from "../src/domain/data-center";

const repository = new DemoDataCenterRepository();
test("fictional dataset preserves unknowns and independent provenance timestamps", async () => {
  const result = await repository.list();
  assert.equal(result.total, 4);
  assert.ok(result.items.every(record => record.isDemo && record.name.startsWith("Demo —")));
  const missing = await repository.getById("demo-004");
  assert.equal(missing?.latitude, null);
  assert.equal(missing?.powerCapacityMw, null);
  assert.equal(missing?.sourceUpdatedAt, null);
  assert.equal(missing?.importedAt, "2026-10-02T00:00:00.000Z");
  assert.equal(await repository.getById("not-found"), null);
});
test("case-insensitive search and exact filters combine with AND", async () => {
  const result = await repository.list({ search: " EMBER ", countryCode: " gb ", city: "LONDON", operator: "fictional ember compute", status: "operational" });
  assert.deepEqual(result.items.map(record => record.id), ["demo-001"]);
  assert.equal((await repository.list({ city: "Lon" })).total, 0);
  assert.equal((await repository.list({ search: "no such facility" })).total, 0);
  assert.equal((await repository.list({ search: "  ", city: null })).total, 4);
});
test("pagination retains totals, stable order, and empty out-of-range pages", async () => {
  const result = await repository.list({}, { page: 2, pageSize: 2 });
  assert.deepEqual(result.items.map(record => record.id), ["demo-003", "demo-004"]);
  assert.equal(result.total, 4);
  assert.equal(result.totalPages, 2);
  assert.deepEqual((await repository.list({}, { page: 9 })).items, []);
  for (const page of [0, -1, 1.5, NaN, Infinity]) await assert.rejects(repository.list({}, { page }), RangeError);
  for (const pageSize of [0, 101, 1.5, NaN]) await assert.rejects(repository.list({}, { pageSize }), RangeError);
});
test("map and list filters stay synchronized, omitting only invalid coordinates", async () => {
  const filters: DataCenterFilters[] = [{}, { search: "ember" }, { countryCode: "FI" }, { city: "Singapore" }, { operator: "Fictional Ember Compute" }, { status: "operational" }, { search: "absent" }];
  for (const filter of filters) {
    const list = await repository.list(filter);
    const map = await repository.getMapFeatures(filter);
    assert.equal(map.matchingCount, list.total);
    assert.deepEqual(map.features.map(feature => feature.id), list.items.filter(hasValidCoordinates).map(record => record.id));
    assert.equal(map.features.length + map.missingCoordinatesCount, list.total);
  }
  const map = await repository.getMapFeatures();
  assert.equal(map.missingCoordinatesCount, 1);
  assert.deepEqual(map.features[0].geometry.coordinates, [-0.1278, 51.5074]);
  assert.equal(map.features.length, 3);
});
test("coordinate validation includes zero and boundaries; rejects missing/nonfinite/out-of-range", async () => {
  for (const [latitude, longitude] of [[0, 0], [90, 180], [-90, -180]]) assert.equal(hasValidCoordinates({ latitude, longitude }), true);
  for (const [latitude, longitude] of [[null, 0], [0, null], [91, 0], [0, -181], [NaN, 0], [0, Infinity]]) assert.equal(hasValidCoordinates({ latitude, longitude }), false);
  const invalidRepo = new DemoDataCenterRepository([{ ...demoFacilities[0], latitude: 91 }]);
  assert.equal((await invalidRepo.list()).total, 1);
  assert.equal((await invalidRepo.getMapFeatures()).features.length, 0);
});
test("filter options are scoped, unique and omit unknown status", async () => {
  const all = await repository.getFilterOptions();
  assert.equal(all.operators.length, 3);
  assert.equal(all.statuses.length, 3);
  assert.deepEqual((await repository.getFilterOptions({ countryCode: "GB" })).cities, ["London"]);
  assert.deepEqual((await repository.getFilterOptions({ search: "absent" })).countries, []);
});
test("callers cannot mutate repository records or nested values", async () => {
  const result = await repository.list();
  result.items[0].name = "Changed";
  result.items[0].tier!.level = "I";
  const record = await repository.getById("demo-001");
  assert.equal(record?.name, "Demo — Ember Quay");
  assert.equal(record?.tier?.level, "III");
});
