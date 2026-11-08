import {json} from '../lib/http.mjs';
// Signups are closed; old clients get an explicit response without provider access.
export default function handler(req,res){json(res,410,{error:'Newsletter signups are closed. You can still contact summitskibike@gmail.com.'});}
