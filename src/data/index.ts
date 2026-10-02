import type { DataCenterRepository } from "./repository";
import { DemoDataCenterRepository } from "./demo/repository";

// Composition boundary: replace only this adapter when persistence is introduced.
export const dataCenterRepository: DataCenterRepository = new DemoDataCenterRepository();
