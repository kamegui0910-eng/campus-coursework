import {execFileSync} from 'node:child_process';
import {mkdirSync,existsSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,relative,isAbsolute,join} from 'node:path';
import {createHash} from 'node:crypto';
const git=(cwd,...args)=>execFileSync('git',['-C',cwd,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
function main(){
 const [mode,repoArg,dirArg]=process.argv.slice(2);
 if(!['pack','receive'].includes(mode)||!repoArg||!dirArg)throw Error('Usage: node transfer.mjs pack|receive <repository> <transfer-directory>');
 const repo=resolve(repoArg),dir=resolve(dirArg),root=git(repo,'rev-parse','--show-toplevel');
 if(resolve(root)!==repo)throw Error('Use the repository root.');
 if(mode==='pack'){
  const rel=relative(repo,dir);if(!rel||!rel.startsWith('..')&&!isAbsolute(rel))throw Error('Transfer output must be outside the repository.');
  if(existsSync(dir))throw Error('Output already exists; use a new directory.');
  if(git(repo,'status','--porcelain'))throw Error('Commit reviewed changes before packaging.');
  const paths=git(repo,'ls-tree','-r','--name-only','HEAD').split('\n');
  if(paths.some(p=>/(^|\/)(\.env(?:\..*)?|\.dev\.vars|node_modules|\.wrangler|credentials|id_rsa|id_ed25519)(\/|$)|\.(pem|p12|key)$/i.test(p)&&!/(?:example|sample|template)$/i.test(p)))throw Error('Tracked sensitive/runtime paths require review before packaging.');
  mkdirSync(dir,{recursive:true});const commit=git(repo,'rev-parse','HEAD'),bundle=join(dir,'source.bundle');
  git(repo,'bundle','create',bundle,'HEAD');
  const manifest={version:1,format:'git-bundle',commit,bundle:'source.bundle',sha256:hash(bundle),createdAt:new Date().toISOString(),scope:'committed-source-history',deployment:'not-implied'};
  writeFileSync(join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify(manifest));return;
 }
 const manifest=JSON.parse(readFileSync(join(dir,'manifest.json'),'utf8'));
 if(manifest.version!==1||manifest.bundle!=='source.bundle'||!/^[0-9a-f]{40}$/.test(manifest.commit)||!/^[0-9a-f]{64}$/.test(manifest.sha256))throw Error('Invalid transfer manifest.');
 const bundle=join(dir,'source.bundle');if(hash(bundle)!==manifest.sha256)throw Error('Bundle checksum mismatch.');
 git(repo,'bundle','verify',bundle);
 const heads=git(repo,'bundle','list-heads',bundle).split('\n');
 if(!heads.some(line=>line===manifest.commit+' HEAD'))throw Error('Bundle HEAD differs from manifest.');
 const branch='sync/import-'+manifest.commit.slice(0,12)+'-'+Date.now();
 git(repo,'fetch',bundle,'HEAD:refs/heads/'+branch);
 if(git(repo,'rev-parse',branch)!==manifest.commit)throw Error('Imported commit mismatch.');
 console.log(JSON.stringify({branch,commit:manifest.commit,worktreeChanged:false,next:'Inspect diff; integrate only after preserving local changes.'}));
}
try{main();}catch(error){console.error(error.message?.startsWith('Command failed:')?'Git operation failed. Inspect repository access and prerequisites without printing credentials.':error.message);process.exitCode=1;}
