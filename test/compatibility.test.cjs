const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const original = require('./fixtures/original/index.cjs');
const migrated = require('../index.cjs');
const outcome = fn => { try { return {value: fn()}; } catch(e) { return {error:e.message}; } };
const normalize = graph => ({root:graph.root,config:graph.config,packages:[...graph.packages],nodes:[...graph.nodes]});
function fixture(t) {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'task-compat-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const write=(name,value)=>{const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value));};
 write('package.json',{private:true,workspaces:['packages/*']});
 for(const name of ['a','b','c']) write('packages/'+name+'/package.json',{name,scripts:{build:'node -e ""',test:'node -e ""'},dependencies:name==='a'?{b:'*'}:{}});
 return {root,write};
}
test('API exports, registry values and validation match original',()=>{
 assert.deepEqual(Object.keys(migrated),Object.keys(original));
 for(const value of [undefined,null,'https://registry.npmjs.org/','http://localhost:1234/a/','https://user:password@example.org','file:///tmp','https://example.org?a=1','invalid','https://example.org/#x'])
  assert.deepEqual(outcome(()=>migrated.registry(value)),outcome(()=>original.registry(value)));
});
test('plans and diagnostics match across configurations and filters',t=>{
 const {root,write}=fixture(t);
 const configurations=[
  {version:1,tasks:{build:{dependsOn:['^build'],cache:true,outputs:['dist/**']},test:{}}},
  {version:1,tasks:{build:{},'a#build':{dependsOn:['b#build']}}},
  {version:1,tasks:{build:{dependsOn:['test']},test:{}}},
  {version:1,tasks:{build:{dependsOn:[{task:'missing#build',optional:true}]}}},
  {version:1,tasks:{build:{dependsOn:['build']}}},
  {version:1,tasks:{build:{dependsOn:['missing#build']}}},
  {version:1,tasks:{build:{dependsOn:[{task:'build',bad:true}]}}},
  {version:1,tasks:{build:{outputs:['../**']}}},
  {version:1,tasks:{build:{outputs:['node_modules/**']}}},
  {version:1,tasks:{build:{outputs:['file.txt']}}},
  {version:1,tasks:{build:{outputs:'dist/**'}}},
  {version:1,tasks:{build:{cache:'true'}}},
  {version:1,tasks:{build:{dependsOn:'build'}}},
  {version:1,tasks:{build:{unknown:true}}},
  {version:2,tasks:{build:{}}},
  {version:1,tasks:{build:{}},unknown:true}
 ];
 let comparisons=0;
 for(const config of configurations){
  write('logos.tasks.json',config);
  assert.deepEqual(outcome(()=>migrated.configuration(root)),outcome(()=>original.configuration(root)));
  comparisons++;
  for(const tasks of [['build'],['test'],[],['unknown']]) for(const filters of [[],['a'],['packages/a'],['missing']]){
   assert.deepEqual(outcome(()=>normalize(migrated.plan(root,tasks,{filters}))),outcome(()=>normalize(original.plan(root,tasks,{filters}))));
   comparisons++;
  }
 }
 assert.equal(comparisons,272);
});
test('discovery patterns and root lookup match original',t=>{
 const {root,write}=fixture(t);
 for(const workspaces of [['packages/*'],{packages:['packages/*']},['packages/a','packages/b'],['packages/**'],['../*'],['packages/?'],['/tmp'],['packages/[ab]'],['packages/a*'],['packages/.*'],42]){
  write('package.json',{workspaces});
  assert.deepEqual(outcome(()=>[...migrated.discover(root)]),outcome(()=>[...original.discover(root)]));
 }
 write('package.json',{workspaces:['packages/*']});
 assert.equal(migrated.findRoot(path.join(root,'packages/a')),original.findRoot(path.join(root,'packages/a')));
});
test('CLI stdout, stderr and status match original',t=>{
 const {root,write}=fixture(t);
 write('logos.tasks.json',{version:1,tasks:{build:{}}});
 for(const args of [[],['--help'],['run','build','--dry-run'],['run','build','--filter','a','--dry-run'],['run','build','--filter','unknown'],['run','build','--ci'],['install','--no-cache'],['unknown'],['run','--typo'],['run','--filter']]){
  const invoke=file=>{
   const result=spawnSync(process.execPath,[file,...args,'--root',root],{encoding:'utf8',env:{...process.env,NODE_NO_WARNINGS:'1'}});
   return {status:result.status,stdout:result.stdout,stderr:result.stderr};
  };
  assert.deepEqual(invoke(path.join(__dirname,'../cli.cjs')),invoke(path.join(__dirname,'fixtures/original/cli.cjs')));
 }
});
test('execution results, output and cross-version cache receipts match original',async t=>{
 const {root,write}=fixture(t);
 write('logos.tasks.json',{version:1,tasks:{build:{cache:true,outputs:['dist/**']}}});
 write('packages/a/package.json',{name:'a',scripts:{build:'node build.cjs'}});
 fs.writeFileSync(path.join(root,'packages/a/build.cjs'),"const fs=require('fs');fs.mkdirSync('dist',{recursive:true});fs.writeFileSync('dist/result','same');");
 for(const name of ['b','c'])write('packages/'+name+'/package.json',{name});
 const options={log(){}};
 assert.deepEqual(await migrated.run(migrated.plan(root,['build']),options),[{id:'a#build',status:'executed'}]);
 assert.deepEqual(await original.run(original.plan(root,['build']),options),[{id:'a#build',status:'cached'}]);
 assert.deepEqual(await migrated.run(migrated.plan(root,['build']),options),[{id:'a#build',status:'cached'}]);
 for(const concurrency of [0,-1,1.5,'2']) {
  const get=async api=>{try {await api.run(api.plan(root,['build']),{...options,concurrency});return null;}catch(e){return e.message;}};
  assert.equal(await get(migrated),await get(original));
 }
});
