import {campusRequest} from './campus-request.mjs';
export async function campusApi<T=unknown>(action:string,payload:Record<string,unknown>={}):Promise<T>{return await campusRequest(action,payload) as T;}
