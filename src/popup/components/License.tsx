import React, { useState } from 'react';
import { LICENSE, LicenseActivateResult, LicenseStorageState } from '../../license';

interface LicenseProps {
  proActive: boolean;
  licenseStatus: LicenseStorageState['licenseStatus'];
  activateLicense: (key: string) => Promise<LicenseActivateResult>;
  removeLicense: () => Promise<void>;
}

const ACTIVATE_ERRORS: Record<string, string> = {
  empty: 'Enter your license key.',
  invalid: 'That key isn’t valid.',
  'not-granted': 'This key isn’t active on your account.',
  network: 'Couldn’t reach Polar — check your connection and try again.',
};

const License: React.FC<LicenseProps> = ({ proActive, licenseStatus, activateLicense, removeLicense }) => {
  const [keyInput, setKeyInput] = useState('');
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleActivate = async () => {
    const key = keyInput.trim();
    setError(null);
    setActivating(true);
    const result = await activateLicense(key);
    setActivating(false);
    if (!result.ok) {
      setError(ACTIVATE_ERRORS[result.error] || ACTIVATE_ERRORS.network);
      return;
    }
    setKeyInput('');
  };

  return (
    <div className="px-4 py-3 border-b border-border-light">
      <div className="flex justify-between items-center mb-2">
        <div className="text-[10px] font-medium text-text-secondary uppercase tracking-wider">License</div>
        <span
          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
            proActive ? 'bg-accent-bg text-accent-dark' : 'bg-bg-secondary text-text-secondary'
          }`}
        >
          {proActive ? 'PRO' : 'FREE'}
        </span>
      </div>

      {proActive ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-text-secondary">
            {licenseStatus === 'granted' ? 'Pro is active on this device.' : `Status: ${licenseStatus ?? 'unknown'}`}
          </span>
          <button
            onClick={() => removeLicense()}
            className="text-[10px] text-text-secondary underline hover:text-accent-dark whitespace-nowrap"
          >
            Remove key
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-1.5">
            <input
              type="text"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
              placeholder="ALT-XXXXXXXX-XXXXXXXX"
              className="flex-1 min-w-0 px-2 py-1 text-[11px] font-mono rounded border border-border-secondary bg-bg-primary text-text-primary"
            />
            <button
              onClick={handleActivate}
              disabled={activating || !keyInput.trim()}
              className="px-2 py-1 text-[11px] font-medium rounded bg-accent text-white disabled:opacity-50 whitespace-nowrap"
            >
              {activating ? 'Activating…' : 'Activate'}
            </button>
          </div>
          {error && <div className="text-[10px] text-red-500">{error}</div>}
          <div className="flex items-center justify-center gap-2 text-[10px] pt-0.5">
            <a href={LICENSE.CHECKOUT_MONTHLY} target="_blank" rel="noopener noreferrer" className="text-accent font-medium hover:text-accent-dark hover:underline">
              Get Pro — {LICENSE.PRICE_MONTHLY}
            </a>
            <span className="text-border-secondary">•</span>
            <a href={LICENSE.CHECKOUT_YEARLY} target="_blank" rel="noopener noreferrer" className="text-accent font-medium hover:text-accent-dark hover:underline">
              {LICENSE.PRICE_YEARLY} (save ~44%)
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default License;
