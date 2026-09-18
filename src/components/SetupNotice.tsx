export default function SetupNotice() {
  return (
    <div className="screen screen-narrow">
      <p className="rubric">Not connected</p>
      <h1 className="display display-md">No database yet</h1>
      <p className="deck">
        This copy of Sagot has no Neon connection string, so it cannot store or load sheets.
      </p>
      <div className="banner banner-info">
        <p>
          Set <code>DATABASE_URL</code> to your Neon connection string, then run{" "}
          <code>npm run db:init</code> once to create the tables.
        </p>
        <p>
          On Vercel, add it under Project settings → Environment Variables, then redeploy.
        </p>
      </div>
    </div>
  );
}
