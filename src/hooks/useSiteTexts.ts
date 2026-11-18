// DevMeDoAnDrOiD
import { useEffect, useState } from 'react';
import { apiUrl, fetchWithTimeout } from '../lib/net';

export interface PlatformSiteTexts {
  siteTitle: string;
  tagline: string;
  heroHeadline: string;
  heroSubheadline: string;
  footerDescription: string;
  emergencyAlertText: string;
  addServiceNotice: string;
  contactWhatsApp: string;
  contactPhone: string;
  footerAboutTitle: string;
  footerAboutLocation: string;
  footerAboutEmergency: string;
  footerAboutEmail: string;
  aboutVillageTitle: string;
  aboutVillageText: string;
}

export const DEFAULT_SITE_TEXTS: PlatformSiteTexts = {
  siteTitle: 'SHAHA ONE | شها ون',
  tagline: 'شها كلها.. أقرب وأسهل في مكان واحد',
  heroHeadline: 'دليلك الرقمي الشامل لجميع أرقام وخدمات شها',
  heroSubheadline:
    'منصة موحدة تجعلك تتواصل مع الأطباء والصيادلة والحرفيين والمحلات والمؤسسات الخدمية في قرية شها بضغطة زر.',
  footerDescription:
    'منصتك الرقمية المتكاملة لخدمات أهالي شها – مركز المنصورة – محافظة الدقهلية. تجمع الخدمات والأرقام والأماكن والتواصل والمساعدات المجتمعية في مكان واحد.',
  emergencyAlertText:
    'طوارئ شها: الإسعاف 123 - المطافئ 180 - نجدة الشرطة 122 - طوارئ الكهرباء 121',
  addServiceNotice:
    'يمكنك طلب إضافة رقمك أو محلك التجاري أو عيادتك مجاناً وسيقوم فريق المنصة بمراجعته ونشره خلال ساعات قليلة.',
  contactWhatsApp: '01012345678',
  contactPhone: '01012345678',
  footerAboutTitle: 'عن قرية شها',
  footerAboutLocation:
    'قرية شها – تابعة لمركز المنصورة – محافظة الدقهلية – جمهورية مصر العربية',
  footerAboutEmergency: 'إسعاف شها: 123 | شرطة النجدة: 122',
  footerAboutEmail: 'تواصل مع المشرف: admin@shaha-directory.eg',
  aboutVillageTitle: 'نبذة عن قرية شها',
  aboutVillageText:
    'شها هي إحدى قرى مركز المنصورة العريقة بمحافظة الدقهلية، وتتميز بموقعها الحيوي وكثافتها السكانية ونشاطها التجاري والمهني المتميز. يهدف هذا الدليل إلى تمكين أبناء شها والمقيمين بها من الحصول على كافة الخدمات اليومية والتواصل المباشر مع أصحاب المهن والمحلات بكل سهولة.'
};

const STORAGE_KEY = 'shaha_site_texts';
let lastFetchAt = 0;
let inflightSync: Promise<PlatformSiteTexts | null> | null = null;

export function getStoredSiteTexts(): PlatformSiteTexts {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_SITE_TEXTS, ...JSON.parse(saved) };
    }
  } catch {
    // ignore invalid cache
  }
  return DEFAULT_SITE_TEXTS;
}

export function persistSiteTextsLocally(texts: PlatformSiteTexts): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(texts));
  } catch {
    // ignore storage quota errors
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('shaha_site_texts_updated'));
  }
}

export async function syncSiteTextsFromServer(): Promise<PlatformSiteTexts | null> {
  const now = Date.now();
  if (now - lastFetchAt < 60_000 && !inflightSync) {
    return null;
  }
  if (inflightSync) return inflightSync;

  inflightSync = (async () => {
    try {
      const res = await fetchWithTimeout(apiUrl('/api/site-texts'), { method: 'GET' }, 4500);
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.success && data.texts && typeof data.texts === 'object') {
        const merged: PlatformSiteTexts = { ...DEFAULT_SITE_TEXTS, ...data.texts };
        lastFetchAt = Date.now();
        persistSiteTextsLocally(merged);
        return merged;
      }
      lastFetchAt = Date.now();
      return null;
    } catch {
      return null;
    } finally {
      inflightSync = null;
    }
  })();

  return inflightSync;
}

export function useSiteTexts(): PlatformSiteTexts {
  const [texts, setTexts] = useState<PlatformSiteTexts>(() => getStoredSiteTexts());

  useEffect(() => {
    const handleUpdate = () => setTexts(getStoredSiteTexts());
    window.addEventListener('shaha_site_texts_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    void syncSiteTextsFromServer();

    return () => {
      window.removeEventListener('shaha_site_texts_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return texts;
}

// Copyright (c) 2026 MeDoAnDrOiD. All Rights Reserved.
