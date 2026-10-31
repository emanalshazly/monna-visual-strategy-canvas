// Packet integrity and observed-state checks; rerun Playwright for execution proof.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
const repo=new URL('..',import.meta.url);
const packet=new URL('docs/verification/attachments/',repo);
const evidence=JSON.parse(await readFile(new URL('results.json',packet),'utf8'));
const sha=x=>createHash('sha256').update(x).digest('hex');
for(const [file,hash] of Object.entries(evidence.sourceSha256))assert.equal(sha(await readFile(new URL(file,repo))),hash,file);
for(const [file,record] of Object.entries(evidence.samples)){
  const bytes=await readFile(new URL(file,packet));assert.equal(bytes.length,record.bytes);assert.equal(sha(bytes),record.sha256);
}
assert.equal(evidence.runs.before.stats.unexpected,8);assert.equal(evidence.runs.before.stats.expected,2);
assert.equal(evidence.runs.after.stats.expected,14);assert.equal(evidence.runs.after.stats.unexpected,0);
for(const run of Object.values(evidence.runs)){
  assert.equal(run.attachmentWorkflows.length,10);
  for(const row of run.attachmentWorkflows){
    assert.equal(row.artifact.blockCount,9);assert.equal(row.artifact.errors,0);
    assert.equal(row.artifact.partners,'Fictional attachment check: "current context" & <shared tools>.');
    assert.ok(row.nativeReads.length);assert.ok(row.nativeReads.every(r=>r.trusted));
  }
}
for(const row of evidence.runs.after.attachmentWorkflows){
  assert.equal(row.actual.submitted.fileContent,row.expectedDocument);
  assert.deepEqual(row.actual.submitted.image??null,row.expectedImage);
  if(row.scenario.action==='pending'){assert.equal(row.prematurelyEnabled,false);assert.equal(row.prematureRequest,null);}
  if(row.scenario.action==='reject')assert.ok(row.errorAfterRelease.includes('Only plain-text'));
  if(row.scenario.action==='abort'){
    assert.ok(row.abortError.includes('could not be read'));assert.equal(row.nativeAborts[0].before,1);assert.equal(row.nativeAborts[0].after,2);
  }
}
for(const [name,check] of Object.entries(evidence.checks))assert.equal(check.exitCode,['matchedBase','final-audit'].includes(name)?1:0,name);
console.log('PASS: source/sample hashes, 20 exported-artifact records, original failures and fixed gateway context/readiness/abort recovery.');
