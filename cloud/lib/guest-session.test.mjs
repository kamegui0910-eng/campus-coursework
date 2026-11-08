import test from 'node:test';
import assert from 'node:assert/strict';
import {newGuestToken,guestIdentity} from './guest-session.mjs';
test('anonymous identity is stable only for a valid private token, and never equals its bearer',async()=>{
 const one=newGuestToken(),two=newGuestToken();assert.match(one,/^[a-f0-9]{64}$/);assert.notEqual(one,two);
 const a=await guestIdentity(one),b=await guestIdentity(two);assert.equal(a.userId,(await guestIdentity(one)).userId);assert.notEqual(a.userId,b.userId);assert(!a.userId.includes(one));assert.equal(a.email,'');
 for(const value of [null,undefined,'owner-a','guest:owner-a','a'.repeat(63),'z'.repeat(64)])assert.equal(await guestIdentity(value),null);
});
