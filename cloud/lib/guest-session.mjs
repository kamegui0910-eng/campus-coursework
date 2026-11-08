// Anonymous bearer stays in an HttpOnly cookie. Only its SHA256 names the
// private record owner; arbitrary owner IDs are never trusted from the client.
export const GUEST_COOKIE='campus_guest';
export const GUEST_MAX_AGE=30*24*60*60;
export function newGuestToken(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');}
export async function guestIdentity(token){
 if(typeof token!=='string'||!(/^[a-f0-9]{64}$/).test(token))return null;
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
 const hash=Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');
 return {userId:'guest:'+hash,displayName:'访客',email:'',fullName:null};
}
