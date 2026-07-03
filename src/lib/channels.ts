// ช่องทางขาย — single source ใช้ทั้งฟอร์ม /orders/new และปุ่มรีออเดอร์
// **ค่า value ต้องตรงชุด legacy ใน sheet_orders** (TIKTOK / FB_PROFILE / FB_PAGE / LINE / OTHER)
// เพื่อไม่ให้กราฟช่องทางแยกก้อน และ Sheet หลังบ้านเข้าใจค่าเดิม
export const CHANNELS = [
  { value: 'TIKTOK',     label: 'TikTok',      icon: 'ri-tiktok-fill',       color: '#000' },
  { value: 'FB_PROFILE', label: 'FB โปรไฟล์',  icon: 'ri-facebook-fill',     color: '#1877F2' },
  { value: 'FB_PAGE',    label: 'FB เพจ',      icon: 'ri-facebook-box-fill', color: '#0E5FC0' },
  { value: 'LINE',       label: 'LINE',        icon: 'ri-line-fill',         color: '#06C755' },
  { value: 'TEL',        label: 'โทร',         icon: 'ri-phone-fill',        color: '#0ea5e9' },
  { value: 'OTHER',      label: 'อื่นๆ',       icon: 'ri-more-line',         color: '#64748b' },
] as const;

export type ChannelValue = (typeof CHANNELS)[number]['value'];

// ค่าที่เคยถูกเขียนด้วยชื่ออื่น → จับคู่เข้าปุ่มที่ใกล้เคียงที่สุด (ใช้ตอน autofill เท่านั้น)
const CHANNEL_ALIASES: Record<string, ChannelValue> = {
  FB: 'FB_PROFILE',
  FACEBOOK: 'FB_PROFILE',
  TIKTOK_SHOP: 'TIKTOK',
  CALL: 'TEL',
};

/** จับคู่ค่า channel ดิบจาก DB → ค่าปุ่มในฟอร์ม (null = ไม่รู้จัก ให้คงค่าเดิมของฟอร์ม) */
export function matchChannel(raw: string | null | undefined): ChannelValue | null {
  if (!raw) return null;
  const up = raw.trim().toUpperCase();
  const direct = CHANNELS.find(c => c.value === up);
  if (direct) return direct.value;
  return CHANNEL_ALIASES[up] ?? null;
}
