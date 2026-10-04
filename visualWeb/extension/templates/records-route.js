import {forward} from '../../../lib/api-proxy';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){return forward(request,'submit','GET');}
export async function POST(request){return forward(request,'submit','POST');}
