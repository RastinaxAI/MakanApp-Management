"""Exercise setup.sh in disposable directories; system mutations are mocked.

Requires Python 3, OpenSSL, the Docker Compose CLI and a runnable Nginx binary.
Set MAKAN_TEST_NGINX_BIN when nginx is not on PATH. No Docker daemon is needed.
"""
from pathlib import Path
import tempfile, shutil, subprocess, os, json, socket, sys

REPO = Path(__file__).resolve().parents[2]
NGINX = os.environ.get('MAKAN_TEST_NGINX_BIN') or shutil.which('nginx')
DOCKER = shutil.which('docker')
if not NGINX or not DOCKER:
    sys.exit('Nginx and Docker Compose CLI are required (Docker daemon is not used).')
with socket.socket() as reserve:
    reserve.bind(('127.0.0.1', 0))
    MANAGEMENT_PORT = reserve.getsockname()[1]

def openssl(*args):
    p = subprocess.run(['openssl', *map(str, args)], capture_output=True, text=True)
    assert p.returncode == 0, p.stderr

with tempfile.TemporaryDirectory(prefix='makan-ssl-tests-') as tmp:
    base = Path(tmp)
    ca = base/'ca'
    ca.mkdir()
    openssl('req', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:P-256', '-nodes', '-keyout', ca/'root.key', '-out', ca/'root.crt', '-days', '7', '-subj', '/CN=Makan Test CA', '-addext', 'basicConstraints=critical,CA:TRUE', '-addext', 'keyUsage=critical,keyCertSign,cRLSign')
    openssl('rehash', ca)
    def certificate(name):
        folder = base/name
        folder.mkdir()
        openssl('req', '-new', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:P-256', '-nodes', '-keyout', folder/'privkey.pem', '-out', folder/'request.csr', '-subj', f'/CN={name}')
        (folder/'extensions').write_text(f'subjectAltName=DNS:{name}\nbasicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature\nextendedKeyUsage=serverAuth\n')
        openssl('x509', '-req', '-in', folder/'request.csr', '-CA', ca/'root.crt', '-CAkey', ca/'root.key', '-CAcreateserial', '-out', folder/'leaf.pem', '-days', '5', '-extfile', folder/'extensions')
        (folder/'fullchain.pem').write_bytes((folder/'leaf.pem').read_bytes() + (ca/'root.crt').read_bytes())
        return folder
    management = certificate('management.makanapp.org')
    app = certificate('app.makanapp.org')

    class Fixture:
        def __init__(self, name):
            self.root = base/name
            self.root.mkdir()
            self.nginx = self.root/'etc/nginx'
            self.live = self.root/'etc/letsencrypt/live'
            self.project = self.root/'project'
            self.project.mkdir()
            for d in ['sites-available','sites-enabled','snippets']:
                (self.nginx/d).mkdir(parents=True)
            self.cert('app.makanapp.org', app)
            self.cert('management.makanapp.org', app)  # actual reported hostname mismatch
            self.site = self.nginx/'sites-available/makanapp-management.conf'
            self.proxy = self.nginx/'snippets/makanapp-management-proxy.conf'
            self.enabled = self.nginx/'sites-enabled/makanapp-management.conf'
            self.site.write_text('# Previous management settings\nserver { listen 39180; server_name management.makanapp.org; return 404; }\n')
            self.proxy.write_text('# Previous snippet\n')
            self.enabled.symlink_to(self.site)
            self.other = self.nginx/'sites-enabled/app.conf'
            self.other.write_text(f'server {{ listen 39180 default_server; listen 39443 ssl default_server; server_name app.makanapp.org; ssl_certificate "{self.live}/app.makanapp.org/fullchain.pem"; ssl_certificate_key "{self.live}/app.makanapp.org/privkey.pem"; return 200 "APP"; }}\n')
            self.default = self.nginx/'sites-enabled/default'
            (self.nginx/'sites-available/default').write_text('server { listen 39181; server_name localhost; return 404; }\n')
            self.default.symlink_to(self.nginx/'sites-available/default')
            self.main = self.root/'nginx.conf'
            fixture_user = 'user root; ' if os.geteuid() == 0 else ''
            self.main.write_text(f'{fixture_user}pid {self.root}/nginx.pid; error_log stderr; events {{}} http {{ client_body_temp_path {self.root}/body; proxy_temp_path {self.root}/proxy; fastcgi_temp_path {self.root}/fastcgi; uwsgi_temp_path {self.root}/uwsgi; scgi_temp_path {self.root}/scgi; access_log off; include {self.nginx}/sites-enabled/*; }}\n')
            self.bin = self.root/'bin'
            self.bin.mkdir()
            self.log = self.root/'commands.jsonl'
            dispatch = self.bin/'dispatch'
            dispatch.write_text('''#!/usr/bin/python3
from pathlib import Path
import os, sys, json, subprocess, shutil
name = Path(sys.argv[0]).name
args = sys.argv[1:]
with open(os.environ['TEST_LOG'], 'a') as f: f.write(json.dumps([name]+args)+'\\n')
root = Path(os.environ['TEST_ROOT'])
failure = os.environ.get('TEST_FAIL','')
if name == 'nginx':
    marker = root/'nginx-failed'
    if failure == 'nginx' and not marker.exists():
        marker.touch(); sys.exit(35)
    result = subprocess.run([os.environ['TEST_NGINX'], '-t', '-e', 'stderr', '-p', str(root), '-c', str(root/'nginx.conf')], capture_output=True)
    if result.returncode: sys.stderr.buffer.write(result.stderr)
    if failure == 'duplicate': print('nginx: [warn] conflicting server name "management.makanapp.org" on 0.0.0.0:80, ignored', file=sys.stderr)
    sys.exit(result.returncode)
if name == 'certbot':
    if failure == 'certbot': sys.exit(36)
    target = root/'etc/letsencrypt/live/management.makanapp.org'
    target.mkdir(parents=True, exist_ok=True)
    for file in ['fullchain.pem','privkey.pem']: shutil.copy2(Path(os.environ['GOOD_CERT'])/file,target/file)
if name == 'curl' and failure == 'curl': sys.exit(60)
if name == 'curl' and failure == 'curl-race' and not (root/'first-handshake-failed').exists():
    (root/'first-handshake-failed').touch(); sys.exit(60)
if name == 'curl' and any(arg.endswith('/api/health') for arg in args):
    if failure == 'identity-html': print('<html>Web app</html>'); sys.exit(0)
    print(json.dumps({'application': 'makan-client' if failure == 'identity' else 'makan-management-panel', 'status': 'ok'}), end='')
if name == 'curl' and any(arg.endswith('/login') for arg in args) and '--write-out' not in args:
    print('<main>Web app login</main>' if failure == 'wrong-login' else '<div data-application="makan-management-panel" data-screen="owner-login"></div>', end='')
if name == 'curl' and '%{redirect_url}' in args: print('https://management.makanapp.org/login' if failure == 'redirect' else 'https://management.makanapp.org/', end='')
if name == 'curl' and '%{http_code}' in args: print('502' if failure == 'application' else '200', end='')
if name == 'docker':
    if args[:2] == ['image','inspect']:
        if (root/'image.json').exists(): print((root/'image.json').read_text()); sys.exit(0)
        sys.exit(1)
    if args[:2] == ['ps','-aq'] and (root/'containers.jsonl').exists(): print('test-container')
    if args[0] == 'inspect' and (root/'containers.jsonl').exists(): print((root/'containers.jsonl').read_text())
    if 'config' in args:
        result = subprocess.run([os.environ['REAL_DOCKER']]+args, capture_output=True)
        sys.stdout.buffer.write(result.stdout)
        sys.stderr.buffer.write(result.stderr)
        sys.exit(result.returncode)
    if 'build' in args and failure == 'build': sys.exit(37)
if name == 'apt-get' and failure == 'apt': sys.exit(38)
sys.exit(0)
''')
            dispatch.chmod(0o755)
            for name in ['nginx','certbot','curl','systemctl','ufw','apt-get','chown','docker']:
                (self.bin/name).symlink_to(dispatch)
            self.script = self.root/'setup.sh'
            text = (REPO/'setup.sh').read_text().replace('${EUID}', '${TEST_EUID:-0}')
            text = text.replace('3101', str(MANAGEMENT_PORT))
            for original, replacement in [('/var/www/makanapp/management',self.project),('/var/www/makanapp',self.root/'www'),('/etc/nginx',self.nginx),('/etc/letsencrypt',self.root/'etc/letsencrypt'),('/var/www/letsencrypt',self.root/'acme'),('/var/backups/makanapp-management',self.root/'backups'),('/etc/ssl/certs',ca)]:
                text = text.replace(original,str(replacement))
            text = text.replace('listen 80;', 'listen 39180;').replace('listen [::]:80;', 'listen [::]:39180;').replace('listen 443 ssl;', 'listen 39443 ssl;').replace('listen [::]:443 ssl;', 'listen [::]:39443 ssl;')
            self.script.write_text(text)
            self.environment = dict(os.environ, PATH=str(self.bin)+':'+os.environ['PATH'],TEST_ROOT=str(self.root),TEST_LOG=str(self.log),TEST_NGINX=NGINX,GOOD_CERT=str(management),REAL_DOCKER=DOCKER)
            self.originals = (self.site.read_bytes(), self.proxy.read_bytes(), os.readlink(self.enabled),self.other.read_bytes(),(self.live/'app.makanapp.org/fullchain.pem').read_bytes())
        def cert(self, name, source):
            target = self.live/name
            target.mkdir(parents=True,exist_ok=True)
            for file in ['fullchain.pem','privkey.pem']: shutil.copy2(source/file,target/file)
        def run(self, failure='', mode='--ssl-only'):
            self.log.write_text('')
            p = subprocess.run(['bash',str(self.script),mode],env=dict(self.environment,TEST_FAIL=failure),capture_output=True,text=True)
            self.calls = [json.loads(line) for line in self.log.read_text().splitlines()]
            return p
        def others_intact(self):
            assert self.other.read_bytes() == self.originals[3]
            assert (self.live/'app.makanapp.org/fullchain.pem').read_bytes() == self.originals[4]
            assert self.default.is_symlink()
        def restored(self):
            assert self.site.read_bytes() == self.originals[0]
            assert self.proxy.read_bytes() == self.originals[1]
            assert os.readlink(self.enabled) == self.originals[2]
            self.others_intact()
        def container(self, project, app_id=None, running=True, port=None):
            labels = {'com.docker.compose.project': project, 'com.docker.compose.service': 'web'}
            if app_id:
                labels['org.makan.application'] = app_id
            metadata = {
                'name': '/existing-web-app', 'running': running, 'labels': labels,
                'ports': {'3000/tcp': [{'HostIp': '127.0.0.1', 'HostPort': str(port or MANAGEMENT_PORT)}]},
            }
            (self.root/'containers.jsonl').write_text(json.dumps(metadata)+'\n')

    for kind in ['host-process', 'foreign-docker', 'foreign-project']:
        fixture = Fixture(f'occupied-{kind}')
        with socket.socket() as listener:
            if kind == 'host-process':
                listener.bind(('127.0.0.1', MANAGEMENT_PORT))
                listener.listen()
            elif kind == 'foreign-docker':
                fixture.container('makan-management')
            else:
                fixture.container('makan-management-panel', running=False)
            result = fixture.run()
        assert result.returncode != 0, kind
        fixture.restored()
        assert not (fixture.root/'backups').exists()
        assert not any(c[0] in ['certbot', 'nginx'] for c in fixture.calls)
        assert all(c[1] in ['info', 'ps', 'inspect'] for c in fixture.calls if c[0] == 'docker')
        print(f'PASS: {kind} collision aborts before changing Nginx or any application container')

    own = Fixture('owned-port')
    own.container('makan-management-panel', 'makan-management-panel')
    with socket.socket() as listener:
        listener.bind(('127.0.0.1', MANAGEMENT_PORT))
        listener.listen()
        result = own.run()
    assert result.returncode == 0, (result.stdout, result.stderr)
    own.others_intact()
    print('PASS: an existing listener owned by the isolated management service permits repeat repair')

    first = Fixture('first')
    result = first.run()
    assert result.returncode == 0, (result.stdout,result.stderr)
    first.others_intact()
    assert 'listen 39443 ssl;' in first.site.read_text()
    assert 'location ^~ /.well-known/acme-challenge/' in first.site.read_text()
    assert any(c[0]=='certbot' and 'certonly' in c and '--webroot' in c for c in first.calls)
    assert not any(c[0] in ['apt-get','chown'] for c in first.calls)
    assert all(c[1] in ['info','ps','inspect'] for c in first.calls if c[0] == 'docker')
    assert f'proxy_pass http://127.0.0.1:{MANAGEMENT_PORT};' in first.proxy.read_text()
    assert 'client_max_body_size 21m;' in first.proxy.read_text()
    assert not any(c[0]=='systemctl' and 'restart' in c for c in first.calls)
    assert all('--insecure' not in c and '-k' not in c for c in first.calls)
    print('PASS: repair wrong-host certificate without Docker mutations or source; dedicated upstream, real OpenSSL/Nginx validation, app/default settings preserved')
    # Run the generated config with the extracted Nginx binary and test actual
    # HTTP redirects, ACME routing, SNI and a trusted TLS connection.
    import ssl, http.client, http.server, time, threading
    forwarded = []
    class ManagementHandler(http.server.BaseHTTPRequestHandler):
        def do_POST(self):
            received = len(self.rfile.read(int(self.headers.get('Content-Length', '0'))))
            body = json.dumps({'receivedBytes': received}).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        def do_GET(self):
            forwarded.append((self.path, self.headers.get('Host')))
            body = json.dumps({'application': 'makan-management-panel', 'status': 'ok'}).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        def log_message(self, *args):
            pass
    upstream = http.server.ThreadingHTTPServer(('127.0.0.1', MANAGEMENT_PORT), ManagementHandler)
    upstream_thread = threading.Thread(target=upstream.serve_forever, daemon=True)
    upstream_thread.start()
    daemon = subprocess.Popen([NGINX, '-p', str(first.root), '-c', str(first.main), '-e', 'stderr', '-g', 'daemon off;'], stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    try:
        for attempt in range(50):
            if daemon.poll() is not None:
                raise AssertionError(daemon.stderr.read().decode())
            try:
                with socket.create_connection(('127.0.0.1',39180), timeout=0.2): pass
                break
            except OSError:
                time.sleep(0.05)
        def http_get(path):
            connection = http.client.HTTPConnection('127.0.0.1',39180,timeout=3)
            connection.request('GET',path,headers={'Host':'management.makanapp.org'})
            response=connection.getresponse()
            value=(response.status,response.getheader('Location'),response.read())
            connection.close()
            return value
        assert http_get('/')[:2] == (301,'https://management.makanapp.org/')
        assert http_get('/?step=mfa')[:2] == (301,'https://management.makanapp.org/?step=mfa')
        assert http_get('/login?step=mfa')[:2] == (301,'https://management.makanapp.org/login?step=mfa')
        assert http_get('/login?access=owner-required')[:2] == (301,'https://management.makanapp.org/login?access=owner-required')
        token = first.root/'acme/.well-known/acme-challenge/test-token'
        token.write_text('ACME verification')
        assert http_get('/.well-known/acme-challenge/test-token') == (200,None,b'ACME verification')
        context=ssl.create_default_context(cafile=str(ca/'root.crt'))
        def https_get(host, path):
            with context.wrap_socket(socket.create_connection(('127.0.0.1',39443),timeout=3),server_hostname=host) as connection:
                connection.sendall(f'GET {path} HTTP/1.1\r\nHost: {host}\r\nConnection: close\r\n\r\n'.encode())
                response=http.client.HTTPResponse(connection)
                response.begin()
                return response.status, response.getheader('Location'), response.read()
        status, _, body = https_get('management.makanapp.org', '/api/health')
        assert status == 200 and json.loads(body)['application'] == 'makan-management-panel'
        assert forwarded == [('/api/health', 'management.makanapp.org')]
        assert https_get('app.makanapp.org', '/api/health') == (200, None, b'APP')
        assert len(forwarded) == 1
        print('PASS: real Nginx forwards management to its dedicated upstream while app SNI/HTTPS still serves the separate web app')
        for path, expected in [('/',(302,'/login'))]:
            with context.wrap_socket(socket.create_connection(('127.0.0.1',39443),timeout=3),server_hostname='management.makanapp.org') as connection:
                connection.sendall(f'GET {path} HTTP/1.1\r\nHost: management.makanapp.org\r\nConnection: close\r\n\r\n'.encode())
                response=http.client.HTTPResponse(connection)
                response.begin()
                from urllib.parse import urlsplit
                target=urlsplit(response.getheader('Location'))
                assert response.status == expected[0]
                assert target.scheme == 'https' and target.hostname == 'management.makanapp.org'
                assert target.path + ('?' + target.query if target.query else '') == expected[1]
                response.read()
        print('PASS: actual Nginx HTTP root upgrades to the same HTTPS root URL; query strings, login alias, ACME and trusted SNI/TLS work')
        assert https_get('management.makanapp.org', '/login')[0] == 200
        assert https_get('management.makanapp.org', '/enter')[0] == 200
        print('PASS: Nginx forwards both login URLs without redirecting the login page to another application')
        def https_upload(size, send_body=True):
            with context.wrap_socket(socket.create_connection(('127.0.0.1',39443),timeout=5),server_hostname='management.makanapp.org') as connection:
                headers = f'POST /api/library/upload HTTP/1.1\r\nHost: management.makanapp.org\r\nContent-Length: {size}\r\nConnection: close\r\n\r\n'
                connection.sendall(headers.encode())
                if send_body:
                    connection.sendall(b'x' * size)
                response = http.client.HTTPResponse(connection)
                response.begin()
                return response.status, response.read()
        status, body = https_upload(2 * 1024 * 1024)
        assert status == 200 and json.loads(body)['receivedBytes'] == 2 * 1024 * 1024
        assert https_upload(22 * 1024 * 1024, send_body=False)[0] == 413
        print('PASS: real TLS/Nginx accepts Library upload above the former 1MB default and rejects requests above 21MB')
    finally:
        daemon.terminate()
        daemon.wait(timeout=5)
        upstream.shutdown()
        upstream.server_close()
        upstream_thread.join(timeout=5)

    result = first.run()
    assert result.returncode == 0 and not any(c[0]=='certbot' for c in first.calls), (result.stdout, result.stderr)
    print('PASS: repeat repair reuses valid certificate without reissuance')

    warming = Fixture('reload-handshake-race')
    result = warming.run('curl-race')
    assert result.returncode == 0, (result.stdout, result.stderr)
    assert (warming.root/'first-handshake-failed').exists()
    assert 'listen 39443 ssl;' in warming.site.read_text()
    warming.others_intact()
    print('PASS: TLS validation tolerates a transient handshake during Nginx reload and still verifies the hostname')

    suffix = Fixture('suffix')
    suffix.cert('management.makanapp.org-0001', management)
    result = suffix.run()
    assert result.returncode == 0, result.stderr
    assert 'management.makanapp.org-0001/fullchain.pem' in suffix.site.read_text()
    assert not any(c[0]=='certbot' for c in suffix.calls)
    suffix.others_intact()
    print('PASS: valid suffixed lineage selected; wrong-host certificate rejected')

    for failure in ['certbot','nginx','duplicate','curl','redirect']:
        fixture = Fixture(f'failure-{failure}')
        result = fixture.run(failure)
        assert result.returncode != 0, failure
        fixture.restored()
        assert 'restored' in result.stderr
        print(f'PASS: {failure} failure restores prior files and symlink without modifying other sites')

    unavailable = Fixture('application-unavailable')
    result = unavailable.run('application')
    assert result.returncode == 0, (result.stdout, result.stderr)
    assert 'HTTP 502' in result.stderr and '--diagnose' in result.stderr
    assert 'listen 39443 ssl;' in unavailable.site.read_text()
    unavailable.others_intact()
    print('PASS: unavailable upstream is reported as HTTP 502 separately from successful TLS repair')

    deploy = Fixture('build-failure')
    deploy.container('makan-management', port=3000)
    for file in ['Dockerfile','compose.yaml','package.json','package-lock.json','.env.docker.example',
                 'next.config.ts','tsconfig.json','postcss.config.mjs','contracts/platform-permissions.json',
                 'scripts/docker-start.mjs','src/app/api/health/route.ts','src/app/login/page.tsx',
                 'src/features/personal-classes/pages.tsx','src/features/personal-classes/review.tsx',
                 'src/app/api/realtime/route.ts','src/lib/personal-class-policy.ts','src/generated/api/contract.json','src/features/personal-classes/membership-picker.tsx','src/lib/personal-class-context.ts',
                 'src/features/auth/login.tsx','src/app/(protected)/admin/[[...section]]/page.tsx']:
        destination = deploy.project/file
        destination.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(REPO/file,destination)
    (deploy.project/'public').mkdir()
    incomplete = Fixture('incomplete-source')
    for file in deploy.project.rglob('*'):
        target = incomplete.project/file.relative_to(deploy.project)
        if file.is_dir(): target.mkdir(parents=True,exist_ok=True)
        elif file.name != 'postcss.config.mjs': shutil.copy2(file,target)
    result = incomplete.run(mode='deploy')
    assert result.returncode != 0
    assert 'postcss.config.mjs' in result.stderr
    assert not incomplete.calls, incomplete.calls
    incomplete.restored()
    print('PASS: incomplete source stops before package, firewall, Nginx or Docker changes')
    shutil.copy2(REPO/'postcss.config.mjs', incomplete.project/'postcss.config.mjs')
    login_source = incomplete.project/'src/features/auth/login.tsx'
    login_source.write_text(login_source.read_text().replace('makan-management-panel', 'makan-client'))
    result = incomplete.run(mode='deploy')
    assert result.returncode != 0 and 'Wrong source' in result.stderr
    assert not incomplete.calls, incomplete.calls
    incomplete.restored()
    print('PASS: source from another MakanApp service cannot deploy as the owner panel')
    secret = '12'*32
    previous_image = 'sha256:' + 'a'*64
    (deploy.root/'image.json').write_text(json.dumps({'id': previous_image, 'labels': {'org.makan.application':'makan-management-panel'}}))
    missing_env = Fixture('missing-existing-environment')
    missing_env.container('makan-management-panel', 'makan-management-panel')
    for item in ['Dockerfile', 'compose.yaml', 'package.json', 'package-lock.json', '.env.docker.example', 'next.config.ts', 'tsconfig.json', 'postcss.config.mjs']:
        shutil.copy2(REPO/item, missing_env.project/item)
    for item in ['src', 'contracts', 'scripts', 'public']:
        shutil.copytree(REPO/item, missing_env.project/item, dirs_exist_ok=True)
    result = missing_env.run(mode='--update')
    assert result.returncode != 0 and 'refusing to replace the session key' in result.stderr, (result.stdout, result.stderr)
    assert not (missing_env.project/'.env.docker').exists()
    assert not any(c[0]=='docker' and 'build' in c for c in missing_env.calls)
    missing_env.restored()
    print('PASS: missing private env in an existing deployment stops before creating a new session key or building')
    envtext = (deploy.project/'.env.docker.example').read_text().replace('SESSION_SECRET=',f'SESSION_SECRET={secret}').replace('http://94.184.32.84:8090','https://backend.example.test')
    (deploy.project/'.env.docker').write_text(envtext)
    result = deploy.run('build','deploy')
    assert result.returncode == 37, (result.stdout,result.stderr)
    assert 'listen 39443 ssl;' in deploy.site.read_text()
    assert 'https://backend.example.test' in (deploy.project/'.env.docker').read_text()
    assert f'SESSION_SECRET={secret}' in (deploy.project/'.env.docker').read_text()
    ssl_index = next(i for i,c in enumerate(deploy.calls) if c[0]=='curl')
    build_index = next(i for i,c in enumerate(deploy.calls) if c[0]=='docker' and 'build' in c)
    assert ssl_index < build_index
    backups = list((deploy.root/'backups').glob('app.*'))
    assert len(backups) == 1
    assert (backups[0]/'env.before').read_text() == envtext
    assert (backups[0]/'previous-image-id').read_text().strip() == previous_image
    assert (backups[0]/'env.before').stat().st_mode & 0o777 == 0o600
    assert backups[0].stat().st_mode & 0o777 == 0o700
    assert secret not in result.stdout + result.stderr
    assert any(c[:3] == ['docker','image','tag'] and c[-2:] == [previous_image,'makan-management-panel:previous'] for c in deploy.calls)
    tag_index = next(i for i,c in enumerate(deploy.calls) if c[:3] == ['docker','image','tag'])
    assert tag_index < build_index
    deploy.others_intact()
    print('PASS: full deployment validates Compose; TLS survives failed app build; existing backend and session key preserved')
    print('PASS: private settings and prior image are retained before build without printing the session secret')

    release_file = deploy.project/'src/app/api/realtime/route.ts'
    release_bytes = release_file.read_bytes()
    release_file.unlink()
    result = deploy.run(mode='--update')
    assert result.returncode != 0 and 'src/app/api/realtime/route.ts' in result.stderr
    assert not deploy.calls
    release_file.write_bytes(release_bytes)
    print('PASS: incomplete vNext upload stops before system, private settings or Docker mutations')

    wrong_image = Fixture('wrong-image-identity')
    for item in deploy.project.rglob('*'):
        target = wrong_image.project/item.relative_to(deploy.project)
        if item.is_dir(): target.mkdir(parents=True,exist_ok=True)
        else: shutil.copy2(item,target)
    (wrong_image.root/'image.json').write_text(json.dumps({'id':previous_image,'labels':{'org.makan.application':'makan-client'}}))
    result = wrong_image.run(mode='--update')
    assert result.returncode != 0 and 'unexpected identity' in result.stderr
    assert not any(c[:3] == ['docker','image','tag'] or (c[0]=='docker' and 'build' in c) for c in wrong_image.calls)
    wrong_image.others_intact()
    print('PASS: a foreign image cannot overwrite the management rollback tag or start a build')

    for retired_origin in ['http://94.184.32.84', 'http://94.184.32.84/']:
        (deploy.project/'.env.docker').write_text(envtext.replace('https://backend.example.test', retired_origin))
        result = deploy.run(mode='--repair')
        assert result.returncode == 0, (result.stdout, result.stderr)
        updated = (deploy.project/'.env.docker').read_text()
        assert '\nBACKEND_BASE_URL=http://94.184.32.84:8090\n' in '\n' + updated
        assert 'BACKEND_BASE_URL=http://94.184.32.84:8090' in updated
        assert f'SESSION_SECRET={secret}' in updated
        deploy.others_intact()
    print('PASS: retired backend origins migrate to port 8090 without changing session secrets or other applications')

    for mode in ['--update', '--start']:
        backup_count = len(list((deploy.root/'backups').glob('app.*')))
        deploy.log.write_text('')
        previous_site = deploy.site.read_text()
        previous_proxy = deploy.proxy.read_text()
        result = deploy.run(mode=mode)
        assert result.returncode == 0, (result.stdout, result.stderr)
        calls = deploy.calls
        assert not any(c[0] in ['nginx', 'certbot'] for c in calls), calls
        assert not any(c[0] == 'ufw' for c in calls), calls
        assert not any(c[0] == 'apt-get' and 'upgrade' in c for c in calls)
        assert deploy.site.read_text() == previous_site
        assert deploy.proxy.read_text() == previous_proxy
        builds = [c for c in calls if c[0] == 'docker' and 'build' in c]
        assert bool(builds) == (mode == '--update'), calls
        assert len(list((deploy.root/'backups').glob('app.*'))) == backup_count + (mode == '--update')
        assert any(c[:3] == ['docker','image','tag'] for c in calls) == (mode == '--update')
        starts = [c for c in calls if c[0] == 'docker' and 'up' in c]
        assert starts and '--no-build' in starts[0] and '--force-recreate' not in starts[0]
        assert f'SESSION_SECRET={secret}' in (deploy.project/'.env.docker').read_text()
        deploy.others_intact()
    print('PASS: update rebuilds only the app; start skips build; both preserve TLS, session secret and other sites')

    deploy.log.write_text('')
    result = subprocess.run(['bash', str(deploy.script), '--repair'],
        env=dict(deploy.environment, COMPOSE_PROJECT_NAME='makan-management', MAKAN_PORT='3000'),
        capture_output=True, text=True)
    assert result.returncode == 0, (result.stdout, result.stderr)
    calls = [json.loads(line) for line in deploy.log.read_text().splitlines()]
    compose_mutations = [c for c in calls if c[0]=='docker' and c[1]=='compose' and any(action in c for action in ['build','up'])]
    assert compose_mutations
    assert all(c[c.index('--project-name')+1] == 'makan-management-panel' for c in compose_mutations)
    assert not any(c[0]=='docker' and any(action in c for action in ['stop','kill','rm','down','prune']) for c in calls)
    assert not any(c[0]=='apt-get' and 'upgrade' in c for c in calls)
    assert f'MAKAN_PORT={MANAGEMENT_PORT}' in (deploy.project/'.env.docker').read_text()
    assert 'COMPOSE_PROJECT_NAME=makan-management-panel' in (deploy.project/'.env.docker').read_text()
    deploy.others_intact()
    print('PASS: repair builds and runs only isolated management, ignores inherited legacy namespace/port, preserves secrets and performs no system upgrade')

    for wrong_app in ['identity', 'identity-html', 'wrong-login']:
        result = deploy.run(wrong_app, '--repair')
        assert result.returncode != 0
        assert ('Wrong login page' if wrong_app == 'wrong-login' else 'Unexpected application') in result.stderr
        deploy.others_intact()
        print(f'PASS: HTTP 200 with {wrong_app} cannot pass management deployment validation')

    shutil.copy2(REPO/'tests/fixtures/legacy-client-compose.yaml', deploy.project/'compose.yaml')
    result = deploy.run(mode='--repair')
    assert result.returncode != 0
    assert 'not isolated' in result.stderr
    assert not any(c[0]=='nginx' or (c[0]=='docker' and any(action in c for action in ['build', 'up'])) for c in deploy.calls)
    deploy.others_intact()
    print('PASS: stale web-app Compose file is rejected before Nginx or application deployment changes')

    result = subprocess.run(['bash',str(first.script),'--ssl-only'],env=dict(first.environment,TEST_EUID='1000'),capture_output=True)
    assert result.returncode != 0
    result = subprocess.run(['bash',str(first.script),'--invalid'],env=first.environment,capture_output=True)
    assert result.returncode != 0
    print('PASS: non-root and invalid arguments rejected')

    diagnostic = Fixture('diagnostic')
    result = diagnostic.run(mode='--diagnose')
    assert result.returncode == 0, result.stderr
    diagnostic.restored()
    assert not (diagnostic.root/'backups').exists()
    assert not (diagnostic.project/'.env.docker').exists()
    assert not any(call[0] in ['apt-get', 'ufw', 'certbot', 'chown'] for call in diagnostic.calls)
    assert all(call[1:] == ['is-active', 'nginx'] for call in diagnostic.calls if call[0] == 'systemctl')
    assert all(call[1] == 'ps' for call in diagnostic.calls if call[0] == 'docker')
    assert 'No configuration was changed.' in result.stdout
    print('PASS: diagnostic mode runs without source files and changes no site, certificate, session or service configuration')
