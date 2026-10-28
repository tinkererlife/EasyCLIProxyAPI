import { useEffect, useState } from 'react';
import { useCoreRuntime } from '../coreRuntime';
import { getVersion } from '../services/platform';
import { detectBundledCore, installBundledCore, type BundledCoreInfo } from '../services/coreVersions';
import { openExternalUrl } from '../services/appSettings';

export function VersionManagementPage() {
  const { status, refreshStatus } = useCoreRuntime();
  const [version, setVersion] = useState('…');
  const [bundled, setBundled] = useState<BundledCoreInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let disposed = false;
    void Promise.all([getVersion(), detectBundledCore()]).then(([appVersion, core]) => {
      if (!disposed) { setVersion(appVersion); setBundled(core); }
    }).catch(error => { if (!disposed) setMessage(String(error)); });
    return () => { disposed = true; };
  }, []);

  async function reinstall() {
    setBusy(true);
    setMessage('Installing the bundled core…');
    try {
      await installBundledCore();
      await refreshStatus();
      setMessage('Bundled core installed.');
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  }

  async function openSource() {
    try {
      await openExternalUrl({ url: 'https://github.com/tinkererlife/EasyCLIProxyAPI' });
    } catch (error) { setMessage(String(error)); }
  }

  return <section className="page management-page version-management-page">
    <div className="version-card-grid">
      <article className="version-list-item app-module-card surface-panel">
        <div className="version-item-content">
          <div className="version-card-top"><h2>Tinkerer Proxy</h2></div>
          <p>Version {version}</p>
          <p>Updates are installed manually by replacing this app with a reviewed build.</p>
          <button type="button" className="secondary-button" onClick={() => void openSource()}>View source and build instructions</button>
        </div>
      </article>
      <article className="version-list-item app-module-card surface-panel">
        <div className="version-item-content">
          <div className="version-card-top"><h2>Bundled proxy core</h2></div>
          <p>Installed: {status?.currentVersion ?? 'Not installed'}</p>
          <p>Bundled: {bundled?.version ?? 'Not available'}</p>
          <p>The app uses the core included in this build. Online core updates are disabled.</p>
          <button type="button" className="secondary-button" disabled={busy || !bundled} onClick={() => void reinstall()}>
            {busy ? 'Installing…' : 'Reinstall bundled core'}
          </button>
        </div>
      </article>
    </div>
    {message && <p role="status">{message}</p>}
  </section>;
}
