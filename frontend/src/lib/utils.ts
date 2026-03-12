export function formatDistance(meters: number | null | undefined): string {
  if (!meters) return "0.0 km";
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatDurationLong(seconds: number | null | undefined): string {
  if (!seconds) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m`;
}

export function formatElevation(meters: number | null | undefined): string {
  if (!meters) return "0 m";
  return `${Math.round(meters).toLocaleString()} m`;
}

export function formatPace(mps: number | null | undefined): string {
  if (!mps) return "—";
  return `${(mps * 3.6).toFixed(1)} km/h`;
}

export function formatPower(watts: number | null | undefined): string {
  if (!watts) return "—";
  return `${Math.round(watts)}W`;
}

export function formatHeartrate(bpm: number | null | undefined): string {
  if (!bpm) return "—";
  return `${Math.round(bpm)} bpm`;
}

export function formatEnergy(kj: number | null | undefined): string {
  if (!kj) return "0 kJ";
  return `${Math.round(kj).toLocaleString()} kJ`;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateShort(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

// Fun metrics
export function guinnessPints(kj: number | null | undefined): number {
  if (!kj) return 0;
  // 1 kJ ≈ 0.239 kcal; 1 pint Guinness ≈ 210 kcal
  return Math.floor((kj * 0.239) / 210);
}

export function everestProgressPercent(elevationM: number | null | undefined): number {
  if (!elevationM) return 0;
  return Math.min((elevationM / 8848) * 100, 100);
}

export function everestMultiple(elevationM: number | null | undefined): string {
  if (!elevationM) return "0×";
  const multiple = elevationM / 8848;
  if (multiple < 1) return `${Math.round(multiple * 100)}%`;
  return `${multiple.toFixed(1)}×`;
}

export function isIndoor(trainer: boolean, sportType?: string): boolean {
  return trainer || sportType === 'VirtualRide';
}

export function rideTypeLabel(trainer: boolean, type: string): string {
  if (isIndoor(trainer, type)) return "Indoor";
  return "Outdoor";
}

export function rideTypeColor(trainer: boolean, sportType?: string): "orange" | "cyan" {
  return isIndoor(trainer, sportType) ? "cyan" : "orange";
}
