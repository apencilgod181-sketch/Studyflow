import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
const base='https://studyflow.apencilgod181.workers.dev';
const email='studyflow-qa-'+randomUUID()+'@example.invalid';
const password=randomBytes(28).toString('base64url');
let cookie='',owner='';
async function call(path,method='GET',body){const response=await fetch(base+'/api/'+path,{method,headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie,'X-StudyFlow-Account':owner},body:body?JSON.stringify(body):undefined});const set=response.headers.getSetCookie();if(set.length)cookie=set.map(x=>x.split(';')[0]).join('; ');const data=await response.json();if(data.user)owner=data.user.id;return {status:response.status,data};}
let result=await call('signup','POST',{name:'Temporary QA',email,password});assert.equal(result.status,200,JSON.stringify(result.data));const id=result.data.user.id;
try {
const plan={assignments:[{id:randomUUID(),name:'Synthetic sync check',subject:'Math',due:'2026-12-01',minutes:25,type:'Assignment',priority:'normal',completed:true}],grades:[{id:randomUUID(),name:'Synthetic quiz',subject:'Math',score:18,max:20,weight:1,date:'2026-11-08'}],budget:75};
result=await call('plan','PUT',{revision:0,data:plan});assert.equal(result.status,200,JSON.stringify(result.data));
assert.equal((await call('plan','PUT',{revision:0,data:plan})).status,409);
await call('logout','POST',{});assert.equal((await call('plan')).status,401);
cookie='';owner='';result=await call('login','POST',{email,password});assert.equal(result.status,200);assert.deepEqual((await call('plan')).data.data,plan);await call('logout','POST',{});
} finally {
 await call('login','POST',{email,password});
 const deleted=await call('delete-account','POST',{email,confirmation:'DELETE'});assert.equal(deleted.status,200,'QA cleanup must succeed');
 assert.equal((await call('me')).data.user,null);
}
console.log(JSON.stringify({passed:true,user_id:id,email,checks:['signup','secure session','D1 persistence','new-session login','assignment and grade sync','conflict rejection','logout','test account deletion']}));
