"use client";

import { SetupProblem } from "@/lib/mapkit";

export default function SetupGate({ problem, onRetry }: { problem: SetupProblem; onRetry: () => void }) {
  return (
    <div className="scrim">
      <div className="dialog">
        <h2>
          Blip <span style={{ color: "var(--pink)" }}>VI</span>
        </h2>
        {problem.missing ? (
          <>
            <p className="lead">
              The map runs on Apple MapKit JS. It needs a Maps ID and private key from your Apple
              Developer account, in <code>.env.local</code>. Missing right now:{" "}
              <b>{problem.missing.join(", ")}</b>.
            </p>
            <ol className="steps">
              <li>
                In <a href="https://developer.apple.com/account/resources/identifiers/list/mapsId" target="_blank" rel="noreferrer">Certificates, Identifiers &amp; Profiles</a> create a <b>Maps ID</b>, then under Keys create a key with MapKit JS enabled and download the <code>.p8</code> file.
              </li>
              <li>
                Put these in <code>.env.local</code>: <code>MAPKIT_TEAM_ID</code> (your 10-character team ID), <code>MAPKIT_KEY_ID</code> (the key's ID) and <code>MAPKIT_PRIVATE_KEY</code> (the whole .p8 file, with line breaks as <code>\n</code>).
              </li>
              <li>Restart <code>npm run dev</code>.</li>
            </ol>
          </>
        ) : (
          <p className="error">{problem.error}</p>
        )}
        <div className="actions">
          <button className="btn primary" onClick={onRetry}>
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
