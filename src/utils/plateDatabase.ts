import licensePlatesData from '../data/licensePlates.json';
import type { PlateInfo } from '../types';

class PlateDatabase {
  private plates: Map<string, PlateInfo>;

  constructor() {
    this.plates = new Map();
    this.loadPlates();
  }

  private loadPlates() {
    licensePlatesData.forEach((plate) => {
      this.plates.set(plate.plate.toUpperCase().replace(/\s/g, ''), plate);
    });
  }

  findPlate(plateNumber: string): PlateInfo | null {
    const normalized = plateNumber.toUpperCase().replace(/\s/g, '');
    return this.plates.get(normalized) || null;
  }

  getAllPlates(): PlateInfo[] {
    return Array.from(this.plates.values());
  }
}

export const plateDatabase = new PlateDatabase();
