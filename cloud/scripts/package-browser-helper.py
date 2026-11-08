from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib,json
root=Path(__file__).resolve().parents[1]
files=['manifest.json','popup.html','popup.css','popup.mjs','collector.mjs','README.txt']
dest=root/'public/downloads/coursework-browser-helper.zip'
dest.parent.mkdir(parents=True,exist_ok=True)
manifest=json.loads((root/'browser-extension/manifest.json').read_text())
assert set(manifest['permissions'])=={'activeTab','scripting'}
assert not manifest.get('host_permissions')
with ZipFile(dest,'w',ZIP_DEFLATED) as archive:
 for name in files:archive.write(root/'browser-extension'/name,'coursework-browser-helper/'+name)
print(json.dumps({'archive':str(dest),'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()}))
