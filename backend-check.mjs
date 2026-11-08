import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {api,passwordHash,validatePlan} from './backend.mjs';
const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync('schema.sql','utf8'));
const DB={prepare(sql){const statement=sqlite.prepare(sql);let values=[];return {bind(...args){values=args;return this;},async first(){return statement.get(...values)||null;},async run(){return statement.run(...values);}};},async batch(statements){sqlite.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
let cookie='',owner='';
async function call(path,method='GET',data,origin='https://studyflow.test'){const request=new Request('https://studyflow.test/api/'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie,'X-StudyFlow-Account':owner,'CF-Connecting-IP':'127.0.0.1'},body:data?JSON.stringify(data):undefined});const response=await api(request,{DB});if(response.headers.get('Set-Cookie'))cookie=response.headers.get('Set-Cookie').split(';')[0];const payload=await response.json();if(payload.user)owner=payload.user.id;return {status:response.status,data:payload};}
const password='Synthetic-StudyFlow-test-only-2026!';
assert.equal((await call('plan')).status,401);
assert.equal((await call('signup','POST',{name:'Test',email:'test@example.com',password},'https://evil.test')).status,403);
let result=await call('signup','POST',{name:'Test',email:'test@example.com',password});assert.equal(result.status,200);const userId=result.data.user.id;const recovery=result.data.recoveryCode;assert.equal(recovery.length,64);const firstCookie=cookie;
const stored=sqlite.prepare('SELECT * FROM users WHERE id=?').get(userId);assert.notEqual(stored.password_hash,password);assert.equal(stored.password_hash,await passwordHash(password,stored.salt));assert.notEqual(stored.recovery_hash,recovery);
assert.equal((await call('me')).data.user.id,userId);
const plan={assignments:[{id:'one',name:'Math homework',subject:'Math',due:'2026-12-01',minutes:30,priority:'normal',type:'Assignment',completed:true}],grades:[{id:'grade-one',subject:'Math',name:'Quiz',score:18,max:20,weight:1,date:'2026-11-08'}],budget:60};
result=await call('plan','PUT',{data:plan,revision:0});assert.equal(result.status,200);assert.equal(result.data.revision,1);
assert.equal((await call('plan','PUT',{data:plan,revision:0})).status,409);
assert.throws(()=>validatePlan({...plan,grades:[{...plan.grades[0],score:25}]}));
await call('logout','POST',{});assert.equal((await call('plan')).status,401);
assert.equal((await call('login','POST',{email:'test@example.com',password:'Wrong-password-long-enough'})).status,401);
result=await call('login','POST',{email:'test@example.com',password});assert.equal(result.status,200);assert.deepEqual((await call('plan')).data.data,plan);
await call('logout','POST',{});await call('signup','POST',{name:'Other student',email:'other@example.com',password});assert.equal((await call('plan')).data.data,null);
const otherCookie=cookie;cookie=firstCookie;assert.equal((await call('plan')).status,401);cookie=otherCookie;
result=await call('recover','POST',{email:'test@example.com',recoveryCode:recovery,password:'New-synthetic-password-only!'});assert.equal(result.status,200);assert.notEqual(result.data.recoveryCode,recovery);assert.equal((await call('plan')).data.data.grades[0].score,18);
assert.equal((await call('google','POST',{credential:'fake'})).status,503);
const passwordCookie=cookie;const nonceResult=await call('google-nonce');const nonce=nonceResult.data.nonce;
const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk=await crypto.subtle.exportKey('jwk',keys.publicKey);jwk.kid='test-key';
const originalFetch=globalThis.fetch;globalThis.fetch=async()=>Response.json({keys:[jwk]});
async function idToken(overrides={}){const header=Buffer.from(JSON.stringify({alg:'RS256',kid:'test-key'})).toString('base64url');const claims={iss:'https://accounts.google.com',aud:'synthetic-client',sub:'synthetic-google-id',email:'google@example.invalid',email_verified:true,given_name:'Google test',nonce,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,...overrides};const payload=Buffer.from(JSON.stringify(claims)).toString('base64url');const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(header+'.'+payload));return header+'.'+payload+'.'+Buffer.from(signature).toString('base64url');}
async function googleCall(token){return api(new Request('https://studyflow.test/api/google',{method:'POST',headers:{Origin:'https://studyflow.test','Content-Type':'application/json',Cookie:'__Host-google-nonce='+nonce,'CF-Connecting-IP':'google-test'},body:JSON.stringify({credential:token})}),{DB,GOOGLE_CLIENT_ID:'synthetic-client'});}
assert.equal((await googleCall(await idToken({aud:'wrong-client'}))).status,401);
assert.equal((await googleCall(await idToken({nonce:'wrong-nonce'}))).status,401);
assert.equal((await googleCall(await idToken({exp:1}))).status,401);
const googleResponse=await googleCall(await idToken());assert.equal(googleResponse.status,200);assert.equal((await googleResponse.json()).user.provider,'google');
globalThis.fetch=originalFetch;
cookie=passwordCookie;result=await call('delete-account','POST',{email:'test@example.com',confirmation:'DELETE'});assert.equal(result.status,200);assert.equal(sqlite.prepare('SELECT id FROM users WHERE id=?').get(userId),undefined);assert.equal(sqlite.prepare('SELECT user_id FROM plans WHERE user_id=?').get(userId),undefined);
console.log('Passed backend: sign-up, hashed credentials, session cookies, sign-in/out, recovery, user isolation, plan/grade persistence, conflict checks, validation, and CSRF rejection.');
