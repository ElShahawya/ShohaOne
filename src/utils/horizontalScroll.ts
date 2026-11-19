// DevMeDoAnDrOiD

export function enableGlobalHorizontalWheelScroll(): () => void {
  // Intentionally a no-op: global non-passive wheel listeners disable browser
  // compositor-threaded scrolling and force layout thrashing on every wheel tick.
  // HorizontalScrollStrip handles horizontal navigation natively without blocking vertical scroll.
  return () => undefined;
}

// Copyright (c) 2026 MeDoAnDrOiD. All Rights Reserved.
