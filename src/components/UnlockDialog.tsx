"use client";

import { useState } from "react";

export default function UnlockDialog({
  onUnlock,
  onCancel,
}: {
  onUnlock: (password: string) => Promise<string>;
  onCancel: () => void;
}) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <form
        className="dialog"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const msg = await onUnlock(pw);
          setBusy(false);
          if (msg) setErr(msg);
        }}
      >
        <h2>Editor only</h2>
        <p>Adding, editing and removing blips is locked. Enter the editor password to unlock this browser.</p>
        <div className="field">
          <label htmlFor="editor-pw">Password</label>
          <input id="editor-pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" autoFocus />
        </div>
        {err && <div className="error">{err}</div>}
        <div className="actions">
          <button type="button" className="btn ghost left" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={busy || !pw}>
            Unlock
          </button>
        </div>
      </form>
    </div>
  );
}
