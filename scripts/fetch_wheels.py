"""Optional recovery for pip CDN timeouts. Verify official PyPI wheel hashes."""
import concurrent.futures
import hashlib
import json
import shutil
import subprocess
import sys
import urllib.request
import math
from pathlib import Path

DEST = Path(__file__).resolve().parents[1] / 'tmp/wheels'
if '--mirror' in sys.argv:
    DEST = DEST / 'mirror'
DEST.mkdir(parents=True, exist_ok=True)
PACKAGES = {'numpy': '2.2.6', 'scipy': '1.15.3', 'scikit-learn': '1.6.1', 'pandas': '2.3.3'}


def download(item):
    name, version = item
    with urllib.request.urlopen(f'https://pypi.org/pypi/{name}/{version}/json', timeout=30) as response:
        metadata = json.load(response)
    wheel = next(f for f in metadata['urls'] if f['filename'].endswith('cp312-cp312-win_amd64.whl'))
    target = DEST / wheel['filename']
    if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest() == wheel['digests']['sha256']:
        print(f'Already verified: {target.name}', flush=True)
        return
    url = wheel['url']
    if '--mirror' in sys.argv:
        url = url.replace('https://files.pythonhosted.org', 'https://mirrors.tuna.tsinghua.edu.cn/pypi/web')
    print(f'Downloading {target.name} with the system HTTP client', flush=True)
    curl = shutil.which('curl.exe') or 'curl'
    command = [curl, '--http1.1', '--fail', '--location', '--retry', '1', '--connect-timeout', '15', '--max-time', '120', '--silent', '--show-error']
    if wheel['size'] > 20_000_000:
        chunk = math.ceil(wheel['size'] / 8)
        prefix = target.read_bytes() if target.exists() else b''

        def part(index):
            start, end = index * chunk, min((index + 1) * chunk, wheel['size']) - 1
            output = target.with_suffix(f'.part{index}')
            if len(prefix) > end:
                output.write_bytes(prefix[start:end+1])
            if not output.exists() or output.stat().st_size != end - start + 1:
                process = subprocess.run([*command, '--range', f'{start}-{end}', '--write-out', '%{http_code}', '--output', str(output), url], check=True, capture_output=True, text=True)
                if process.stdout != '206' or output.stat().st_size != end - start + 1:
                    raise RuntimeError(f'Incomplete range response for {target.name} part {index}')
            print(f'Downloaded {target.name} part {index+1}/8', flush=True)
            return output

        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as parts:
            completed = list(parts.map(part, range(8)))
        with target.open('wb') as output:
            for path in completed:
                output.write(path.read_bytes())
    else:
        subprocess.run([*command, '--output', str(target), url], check=True)
    if hashlib.sha256(target.read_bytes()).hexdigest() != wheel['digests']['sha256']:
        raise RuntimeError(f'PyPI checksum verification failed: {target.name}')
    print(f'Verified: {target.name}', flush=True)


with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    list(pool.map(download, PACKAGES.items()))
