// DevMeDoAnDrOiD
import { useEffect, useState } from 'react';

export type DeviceFormFactor = 'mobile' | 'tablet' | 'desktop';

export interface AppInstallState {
  isStandalone: boolean;
  isInstalled: boolean;
  deviceType: DeviceFormFactor;
  prefersReducedMotion: boolean;
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const standaloneMedia =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: window-controls-overlay)').matches ||
    window.matchMedia?.('(display-mode: fullscreen)').matches;
  const iosStandalone = Boolean((window.navigator as { standalone?: boolean }).standalone);
  const twaReferrer = typeof document !== 'undefined' && document.referrer.startsWith('android-app://');
  return Boolean(standaloneMedia || iosStandalone || twaReferrer);
}

function detectDeviceType(): DeviceFormFactor {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  if (w < 640) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

export function useAppInstallState(): AppInstallState {
  const [isStandalone, setIsStandalone] = useState<boolean>(detectStandalone);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (detectStandalone()) return true;
    try {
      return localStorage.getItem('shaha_pwa_installed') === '1';
    } catch {
      return false;
    }
  });
  const [deviceType, setDeviceType] = useState<DeviceFormFactor>(detectDeviceType);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  });

  useEffect(() => {
    const standaloneQuery = window.matchMedia?.('(display-mode: standalone)');
    const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');

    const syncStandalone = () => {
      const standaloneNow = detectStandalone();
      setIsStandalone(standaloneNow);
      if (standaloneNow) {
        setIsInstalled(true);
        try {
          localStorage.setItem('shaha_pwa_installed', '1');
        } catch {
          // ignore storage errors
        }
      }
    };

    const handleResize = () => setDeviceType(detectDeviceType());
    const handleAppInstalled = () => {
      setIsInstalled(true);
      try {
        localStorage.setItem('shaha_pwa_installed', '1');
      } catch {
        // ignore storage errors
      }
    };
    const handleMotionChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);

    const checkRelatedApps = async () => {
      const nav = navigator as Navigator & { getInstalledRelatedApps?: () => Promise<unknown[]> };
      if (typeof nav.getInstalledRelatedApps === 'function') {
        try {
          const apps = await nav.getInstalledRelatedApps();
          if (Array.isArray(apps) && apps.length > 0) {
            setIsInstalled(true);
            try {
              localStorage.setItem('shaha_pwa_installed', '1');
            } catch {
              // ignore storage errors
            }
          }
        } catch {
          // ignore unsupported error
        }
      }
    };

    syncStandalone();
    void checkRelatedApps();

    window.addEventListener('resize', handleResize);
    window.addEventListener('appinstalled', handleAppInstalled);
    standaloneQuery?.addEventListener?.('change', syncStandalone);
    motionQuery?.addEventListener?.('change', handleMotionChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('appinstalled', handleAppInstalled);
      standaloneQuery?.removeEventListener?.('change', syncStandalone);
      motionQuery?.removeEventListener?.('change', handleMotionChange);
    };
  }, []);

  return {
    isStandalone,
    isInstalled,
    deviceType,
    prefersReducedMotion
  };
}

// Copyright (c) 2026 MeDoAnDrOiD. All Rights Reserved.
