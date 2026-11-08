#!/usr/bin/env python3
"""Mirror committed cloud source into an existing clean GitHub checkout; never force push."""
import argparse, io, json, os, pathlib, shutil, subprocess, tarfile
p=argparse.ArgumentParser();p.add_argument('--mirror',required=True);p.add_argument('--branch',default='sync/2026-11-08-browser-import');p.add_argument('--receipt',required=True);a=p.parse_args()
source=pathlib.Path(__file__).resolve().parents[1];mirror=pathlib.Path(a.mirror).resolve()
def git(root,*args,check=True):
 return subprocess.run(['git','-C',str(root),*args],check=check,stdout=subprocess.PIPE,stderr=subprocess.PIPE,env={**os.environ,'GIT_TERMINAL_PROMPT':'0'})
if git(source,'status','--porcelain').stdout.strip():raise SystemExit('Commit source changes before syncing.')
if git(mirror,'status','--porcelain').stdout.strip():raise SystemExit('Target has local changes; use a clean worktree.')
remote=git(mirror,'remote','get-url','origin').stdout.decode().strip()
if remote not in ['https://github.com/kamegui0910-eng/campus-coursework.git','https://github.com/kamegui0910-eng/campus-coursework']:raise SystemExit('Unexpected target remote; verify repository first.')
if git(mirror,'branch','--show-current').stdout.decode().strip()!=a.branch:raise SystemExit('Target branch differs; create an isolated worktree on the requested branch.')
sha=git(source,'rev-parse','HEAD').stdout.decode().strip()
archive=tarfile.open(fileobj=io.BytesIO(git(source,'archive','HEAD').stdout))
for member in archive.getmembers():
 parts=pathlib.PurePosixPath(member.name).parts
 if member.issym() or member.islnk() or '..' in parts or member.name.startswith('/') or any(x in ['.env','.dev.vars','.wrangler','node_modules'] for x in parts):raise SystemExit('Unsafe source archive member; inspect before syncing.')
cloud=mirror/'cloud'
if cloud.exists():shutil.rmtree(cloud)
cloud.mkdir();archive.extractall(cloud,filter='data')
git(mirror,'add','--','cloud')
if git(mirror,'diff','--cached','--quiet',check=False).returncode:
 git(mirror,'commit','-m','Sync cloud source '+sha[:12]+' with guided setup')
head=git(mirror,'rev-parse','HEAD').stdout.decode().strip()
push=git(mirror,'push','origin','HEAD:refs/heads/'+a.branch,check=False)
verified=False
if push.returncode==0:
 result=git(mirror,'ls-remote','origin','refs/heads/'+a.branch,check=False)
 verified=result.returncode==0 and result.stdout.decode().split()[0]==head if result.stdout.strip() else False
receipt={'sourceCommit':sha,'targetCommit':head,'repository':remote,'branch':a.branch,'mapping':'. -> cloud/','verified':verified,'status':'synced' if verified else 'pending','reason':None if verified else 'Push or remote verification failed; check GitHub repository write permission. No credentials or server output recorded.'}
pathlib.Path(a.receipt).write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))
raise SystemExit(0 if verified else 2)
