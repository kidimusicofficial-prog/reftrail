"""Differential CLI checks. Run with paths to a candidate .mjs and GNU uniq."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from hashlib import sha256
from itertools import product
from pathlib import Path
from random import Random
import json
import os
import subprocess
import sys
import time

candidate, reference = sys.argv[1:]
environment = dict(os.environ, LC_ALL="C", LANG="C")
start = datetime.now(timezone.utc)
clock = time.monotonic()
version = subprocess.check_output([reference, "--version"], env=environment).splitlines()[0].decode()
assert version.startswith("uniq (GNU coreutils) ")
seed = 573448
rng = Random(seed)
records = [b"", b"\x00", b"\x00\xff", b"\x00\xfe", b"\x0d", b"\x7f", b"a", b"A", b" a", b"a "]
records.extend(bytes([byte]) for byte in range(256) if byte != 10)
samples = []
for i in range(32):
    lines = []
    for _ in range(8 + i % 5):
        value = rng.choice(records)
        lines += [value] * rng.choice([1, 1, 2, 3, 9])
    samples.append(b"\n".join(lines) + (b"\n" if i % 2 else b""))
for size in [4095, 4096, 4097, 65535, 65536, 65537, 131073]:
    same = b"\xa3" * size
    samples.append(b"\n".join([b"", same, same, same[:-1]+b"\x00", same, b"", b""]))
samples.append(b"T\n"*10001)
assert len(set(samples))==len(samples)

def check(item):
    idx, args = item
    raw = samples[idx]
    a = subprocess.run(["node", candidate, *args], input=raw, capture_output=True, timeout=12, env=environment)
    b = subprocess.run([reference, *args], input=raw, capture_output=True, timeout=12, env=environment)
    if a.returncode != b.returncode or b.returncode != 0 or a.stdout != b.stdout or a.stderr or b.stderr:
        raise ValueError((idx,args))
    return [idx, list(args), sha256(raw).hexdigest(), sha256(a.stdout).hexdigest()]

cases = list(product(range(len(samples)), [(), ("-c",), ("-u",), ("-d",)]))
with ThreadPoolExecutor(max_workers=4) as pool:
    claims = list(pool.map(check, cases))
invalid = [("",), ("-",), ("--",), ("-D",), ("-dd",), ("-d", "file"), ("-c", "-c"), ("-u ",), ("--unique",), ("--help",)]
for args in invalid:
    a = subprocess.run(["node",candidate,*args], env=environment, input=b"X\nX\n", capture_output=True, timeout=12)
    if a.returncode==0 or a.stdout or not a.stderr:
        raise ValueError(args)
print(json.dumps({
    "reference":version,"node":subprocess.check_output(["node","--version"]).decode().strip(),
    "locale":"C","seed":seed,"samples":len(samples),"referenceComparisons":len(cases),
    "localRejections":len(invalid),"start":start.isoformat(),"end":datetime.now(timezone.utc).isoformat(),
    "elapsedSeconds":round(time.monotonic()-clock,3),
    "candidateSha256":sha256(Path(candidate).read_bytes()).hexdigest(),
    "reviewScriptSha256":sha256(Path(__file__).read_bytes()).hexdigest(),
    "orderedResultListSha256":sha256(json.dumps(claims,separators=(",",":")).encode()).hexdigest(),
    "status":"PASS"
},ensure_ascii=True,indent=2))
