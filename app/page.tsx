const roadmap = [
  { name: "Engine Room", completed: 0, planned: 40 },
  { name: "RAM Marketplace", completed: 20, planned: 20 },
  { name: "Compliance Engine", completed: 21, planned: 21 }
];

function percent(completed: number, planned: number) {
  return planned === 0 ? 0 : Math.round((completed / planned) * 100);
}

export default function Home() {
  return (
    <main className="shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand">ENGINE ROOM</div>
        <nav>
          <a className="active" href="/">Home</a>
          <a href="/projects">Projects</a>
          <a href="/finance">Finance</a>
          <a href="/users">Users</a>
          <a href="/operations">Operations</a>
          <a href="/releases">Releases</a>
          <a href="/alerts">Alerts</a>
          <a href="/about">About</a>
          <a href="/settings">Settings</a>
        </nav>
      </aside>

      <section className="content">
        <header className="hero">
          <p className="eyebrow">Software Portfolio</p>
          <h1>Engine Room</h1>
          <p>Portfolio-wide control from approved development plan through production operations.</p>
        </header>

        <section className="panel" aria-labelledby="portfolio-progress">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Live roadmap</p>
              <h2 id="portfolio-progress">Portfolio progress</h2>
            </div>
            <span className="status-lamp" aria-label="System online" />
          </div>

          <div className="project-list">
            {roadmap.map((project) => {
              const value = percent(project.completed, project.planned);
              return (
                <article className="project-row" key={project.name}>
                  <button className="disclosure" aria-label={`Expand ${project.name}`}>▶</button>
                  <strong>{project.name}</strong>
                  <div
                    className="glass-tube"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={project.planned}
                    aria-valuenow={project.completed}
                    aria-label={`${project.name} roadmap progress`}
                  >
                    <span className="glass-fill" style={{ width: `${value}%` }} />
                  </div>
                  <span className="count">{project.completed}/{project.planned} PRs</span>
                  <span className="percentage">{value}%</span>
                </article>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}
