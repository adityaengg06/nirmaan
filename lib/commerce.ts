export const ADMIN_EMAIL = 'buisness.aditya2006@gmail.com';
export const POLICY_VERSION = '2026-11-10';
export const TERMS = 'Payments are non-refundable. Orders cannot be cancelled after confirmation. This does not limit rights required by applicable law.';
export const STARTER_AMOUNT = 99;
export const RENEWALS: Record<string, number> = { '1': 60, '3': 150, '6': 250, '12': 450 };
export const PRODUCT_IDS = ['reviews', 'menu', 'social', 'id-card', 'business', 'custom'];
export const STATES = ['Andaman and Nicobar Islands','Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chandigarh','Chhattisgarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jammu and Kashmir','Jharkhand','Karnataka','Kerala','Ladakh','Lakshadweep','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Puducherry','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal'];
export type Address = { recipient: string; phone: string; line1: string; line2: string; landmark: string; city: string; district: string; state: string; pincode: string; country: string };
export type Profile = { name: string; phone: string; business: string; address: Address };
export const EMPTY_ADDRESS: Address = {recipient:'',phone:'',line1:'',line2:'',landmark:'',city:'',district:'',state:'',pincode:'',country:'India'};
export function validPhone(value: unknown): value is string { return typeof value === 'string' && /^(?:\+91[ -]?)?[6-9]\d{9}$/.test(value.replace(/[ ()-]/g, '')); }
export function validAddress(value: unknown): value is Address {
  if (!value || typeof value !== 'object') return false;
  const a = value as Address;
  return ['recipient','line1','city','district'].every(k => typeof a[k as keyof Address] === 'string' && a[k as keyof Address].trim().length >= 2 && a[k as keyof Address].length <= 200)
    && validPhone(a.phone) && typeof a.state === 'string' && STATES.includes(a.state) && typeof a.pincode === 'string' && /^[1-9]\d{5}$/.test(a.pincode) && a.country === 'India'
    && ['line2','landmark'].every(k => typeof a[k as keyof Address] === 'string' && a[k as keyof Address].length <= 200);
}
export function validDestination(value: unknown) { try { const url = new URL(String(value)); return ['http:', 'https:'].includes(url.protocol); } catch { return false; } }
export function addMonths(start: Date, months: number) { const date = new Date(start); const day = date.getUTCDate(); date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + months); const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate(); date.setUTCDate(Math.min(day, lastDay)); return date.toISOString(); }
export function isExpired(row: {kind:string;status:string;expiresAt:string|null}) { return row.kind === 'order' && row.status === 'active' && !!row.expiresAt && Date.parse(row.expiresAt) < Date.now(); }
export function sameOrigin(request: Request) { return request.headers.get('origin') === new URL(request.url).origin; }
