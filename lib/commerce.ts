export const ADMIN_EMAIL = 'buisness.aditya2006@gmail.com';
export const POLICY_VERSION = '2026-11-10';
export const TERMS = 'Payments are non-refundable. Orders cannot be cancelled after confirmation. This does not limit rights required by applicable law.';
export const STARTER_AMOUNT = 99;
export const RENEWALS: Record<string, number> = { '1': 60, '3': 150, '6': 250, '12': 450 };
export const PRODUCT_IDS = ['reviews', 'menu', 'social', 'id-card', 'business', 'event', 'custom'];
export const STATES = ['Andaman and Nicobar Islands','Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chandigarh','Chhattisgarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jammu and Kashmir','Jharkhand','Karnataka','Kerala','Ladakh','Lakshadweep','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Puducherry','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal'];
export type Address = { recipient: string; phone: string; line1: string; line2: string; landmark: string; city: string; district: string; state: string; pincode: string; country: string };
export type Profile = { name: string; phone: string; business: string; address: Address };
export const EMPTY_ADDRESS: Address = {recipient:'',phone:'',line1:'',line2:'',landmark:'',city:'',district:'',state:'',pincode:'',country:'India'};
// Formatting is allowed in browser fields; these shared validators check the
// actual Indian number and return one consistent value for storage/checkout.
export const PHONE_INPUT_PATTERN = String.raw`[\s0-9\+\-\(\)]{10,40}`;
export function normalizePhone(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 40) return null;
  let phone = value.trim().replace(/[\s()-]/g, '');
  if (phone.startsWith('+91')) phone = phone.slice(3);
  else if (phone.startsWith('0091')) phone = phone.slice(4);
  else if (phone.length === 12 && phone.startsWith('91')) phone = phone.slice(2);
  if (phone.length === 11 && phone.startsWith('0')) phone = phone.slice(1);
  return phone;
}
export function validPhone(value: unknown): value is string {
  const phone = normalizePhone(value);
  return phone !== null && /^[6-9]\d{9}$/.test(phone);
}
export type ValidationResult<T> = { ok: true; value: T } | { ok: false; field: string; message: string };
function invalid(field: string, message: string): { ok: false; field: string; message: string } { return { ok: false, field, message }; }
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
export function validateAddressInput(value: unknown): ValidationResult<Address> {
  if (!record(value)) return invalid('address', 'Enter your complete delivery address.');
  const required: Array<[keyof Address, string]> = [
    ['recipient', 'Enter the delivery recipient’s full name.'],
    ['phone', 'Enter a valid 10-digit Indian delivery mobile number.'],
    ['line1', 'Enter the house, flat or shop number and building.'],
    ['city', 'Enter the delivery city or town.'],
    ['district', 'Enter the delivery district.'],
    ['state', 'Select the delivery state or union territory.'],
    ['pincode', 'Enter a valid six-digit delivery PIN code.'],
  ];
  for (const [field, message] of required) if (typeof value[field] !== 'string') return invalid('address.' + field, message);
  for (const [field, label] of [['line2', 'Street / area'], ['landmark', 'Nearby landmark']] as const) {
    if (value[field] !== undefined && value[field] !== null && typeof value[field] !== 'string') return invalid('address.' + field, label + ' must be entered as text.');
  }
  if (value.country !== undefined && typeof value.country !== 'string') return invalid('address.country', 'Delivery is available only in India.');
  const stateText = (value.state as string).trim().replace(/\s+/g, ' ');
  const country = value.country === undefined ? 'India' : (value.country as string).trim();
  const address: Address = {
    recipient: (value.recipient as string).trim(), phone: normalizePhone(value.phone) || '',
    line1: (value.line1 as string).trim(), line2: typeof value.line2 === 'string' ? value.line2.trim() : '',
    landmark: typeof value.landmark === 'string' ? value.landmark.trim() : '',
    city: (value.city as string).trim(), district: (value.district as string).trim(),
    state: STATES.find(state => state.toLowerCase() === stateText.toLowerCase()) || stateText,
    pincode: (value.pincode as string).trim().replace(/\s+/g, ''),
    country: country.toLowerCase() === 'india' ? 'India' : country,
  };
  if (address.recipient.length < 2 || address.recipient.length > 200) return invalid('address.recipient', 'Enter the delivery recipient’s full name (2–200 characters).');
  if (!validPhone(value.phone)) return invalid('address.phone', 'Enter a valid 10-digit Indian delivery mobile number.');
  if (!address.line1 || address.line1.length > 200) return invalid('address.line1', 'Enter the house, flat or shop number and building (up to 200 characters).');
  if (address.city.length < 2 || address.city.length > 200) return invalid('address.city', 'Enter the delivery city or town (2–200 characters).');
  if (address.district.length < 2 || address.district.length > 200) return invalid('address.district', 'Enter the delivery district (2–200 characters).');
  if (!STATES.includes(address.state)) return invalid('address.state', 'Select a valid Indian state or union territory.');
  if ((value.pincode as string).length > 20 || !/^[1-9]\d{5}$/.test(address.pincode)) return invalid('address.pincode', 'Enter a valid six-digit delivery PIN code, for example 226001.');
  if (address.country !== 'India') return invalid('address.country', 'Delivery is available only in India.');
  if (address.line2.length > 200) return invalid('address.line2', 'Keep the street / area under 200 characters.');
  if (address.landmark.length > 200) return invalid('address.landmark', 'Keep the nearby landmark under 200 characters.');
  return { ok: true, value: address };
}
export function normalizeAddress(value: unknown): Address | null {
  const result = validateAddressInput(value); return result.ok ? result.value : null;
}
export function validAddress(value: unknown): boolean { return validateAddressInput(value).ok; }
export function validateProfileInput(value: unknown): ValidationResult<Profile> {
  if (!record(value)) return invalid('profile', 'Enter your account details.');
  if (typeof value.name !== 'string' || value.name.trim().length < 2 || value.name.trim().length > 100) return invalid('name', 'Enter your full name (2–100 characters).');
  if (!validPhone(value.phone)) return invalid('phone', 'Enter a valid 10-digit Indian WhatsApp number. You may include +91.');
  if (typeof value.business !== 'string' || value.business.trim().length < 2 || value.business.trim().length > 150) return invalid('business', 'Enter your business or organization name (2–150 characters).');
  const address = validateAddressInput(value.address); if (!address.ok) return address;
  return { ok: true, value: { name: value.name.trim(), phone: normalizePhone(value.phone)!, business: value.business.trim(), address: address.value } };
}
export function validDestination(value: unknown) { try { const url = new URL(String(value)); return ['http:', 'https:'].includes(url.protocol); } catch { return false; } }
export function addMonths(start: Date, months: number) { const date = new Date(start); const day = date.getUTCDate(); date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + months); const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate(); date.setUTCDate(Math.min(day, lastDay)); return date.toISOString(); }
export function isExpired(row: {kind:string;status:string;expiresAt:string|null}) { return row.kind === 'order' && row.status === 'active' && !!row.expiresAt && Date.parse(row.expiresAt) < Date.now(); }
export function sameOrigin(request: Request) { return request.headers.get('origin') === new URL(request.url).origin; }
