import {cookies} from 'next/headers';
import {getChatGPTUser} from './chatgpt-auth';
import {GUEST_COOKIE,GUEST_MAX_AGE,newGuestToken,guestIdentity} from '@/lib/guest-session.mjs';
export async function getCourseworkUser(){
 const signedIn=await getChatGPTUser();if(signedIn)return signedIn;
 return guestIdentity((await cookies()).get(GUEST_COOKIE)?.value);
}
export async function startGuest(){
 const signedIn=await getChatGPTUser();if(signedIn)return {mode:'signed-in'};
 const jar=await cookies();let token=jar.get(GUEST_COOKIE)?.value;
 if(!await guestIdentity(token))token=newGuestToken();
 jar.set(GUEST_COOKIE,token!,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:GUEST_MAX_AGE});
 return {mode:'guest',expiresInDays:30};
}
