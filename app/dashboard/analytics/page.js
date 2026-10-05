'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Navbar from '@/components/Navbar';
import { RequireAuth, Skeleton, EmptyState, Avatar, StatTile, Spinner, timeAgo, formatDate } from '@/components/ui';
import { getAllProgress, buildMaterialInsights, buildActivitySeries, buildLeaderboard } from '@/lib/progress';
import { getAllFeedback } from '@/lib/feedback';
import { getAllUsers } from '@/lib/users';
import { getAllMaterials } from '@/lib/materials';
import './analytics.css';

const ACTIVITY_DAYS = 14;
const FEEDBACK_PAGE = 6;

const COLUMNS = [
  { key: 'name', label: 'Material', type: 'text' },
  { key: 'started', label: 'Learners', type: 'num' },
  { key: 'completed', label: 'Completed', type: 'num' },
  { key: 'completionRate', label: 'Completion rate', type: 'num' },
  { key: 'avgRating', label: 'Rating', type: 'num' },
  { key: 'lastActivity', label: 'Last activity', type: 'date' },
];

export default function AnalyticsPage() {
  return (
    <RequireAuth role="trainer">
      <AnalyticsView />
    </RequireAuth>
  );
}

/* -------------------------------------------------------------------------- */

function csvCell(value) {
  let s = value == null ? '' : String(value);
  if (/^[=+\-@]/.test(s)) s = `'${s}`; // keep spreadsheet apps from running formulas
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(filename, rows) {
  const csv = rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function isDone(p) {
  return !!p.completed || ((p.totalPages || 0) > 0 && (p.viewedPages || []).length >= p.totalPages);
}

function Stars({ value, size = 16 }) {
  const rounded = Math.round(value);
  return (
    <span className="an-stars" role="img" aria-label={`Rated ${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <i key={s} className={`material-icons ${s <= rounded ? 'on' : ''}`} style={{ fontSize: size }} aria-hidden="true">
          star
        </i>
      ))}
    </span>
  );
}

/* -------------------------------------------------------------------------- */

/** One round of reads powers every widget on the page. */
async function fetchAnalytics() {
  const [materials, progress, feedback, users] = await Promise.all([
    getAllMaterials(),
    getAllProgress(),
    getAllFeedback(),
    getAllUsers(),
  ]);
  return {
    materials,
    progress,
    feedback,
    users,
    series: buildActivitySeries(progress, ACTIVITY_DAYS, Date.now()),
  };
}

function AnalyticsView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    fetchAnalytics()
      .then((next) => {
        if (active) setData(next);
      })
      .catch((err) => {
        console.error('Error loading analytics:', err);
        if (active) setLoadError(err?.message || 'Something went wrong');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      setData(await fetchAnalytics());
      setLoadError(null);
      toast.success('Analytics are up to date');
    } catch (err) {
      console.error('Error refreshing analytics:', err);
      toast.error('Could not refresh analytics. Try again in a moment.');
    } finally {
      setRefreshing(false);
    }
  };

  const view = useMemo(() => {
    if (!data) return null;
    const { materials, progress, feedback, users } = data;
    const trainers = users.filter((u) => u.role === 'trainer').length;
    const trainees = users.length - trainers;
    const learnerIds = new Set(progress.map((p) => p.uid).filter(Boolean));
    const completions = progress.filter(isDone).length;
    const ratingSum = feedback.reduce((s, f) => s + (f.rating || 0), 0);
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    feedback.forEach((f) => { if (distribution[f.rating] !== undefined) distribution[f.rating] += 1; });
    const audience = trainees || users.length;
    return {
      trainers,
      trainees,
      activeLearners: learnerIds.size,
      engagement: users.length ? Math.round((learnerIds.size / users.length) * 100) : 0,
      enrollments: progress.length,
      completions,
      completionRate: progress.length ? Math.round((completions / progress.length) * 100) : 0,
      avgRating: feedback.length ? Math.round((ratingSum / feedback.length) * 10) / 10 : 0,
      ratingCount: feedback.length,
      distribution,
      insights: buildMaterialInsights(materials, progress, feedback, audience),
      leaderboard: buildLeaderboard(progress, users, 10),
      materialCount: materials.length,
    };
  }, [data]);

  const exportCsv = () => {
    if (!view) return;
    const rows = [
      ['Material', 'Category', 'Pages', 'Learners started', 'Completed', 'In progress', 'Completion rate %', 'Average progress %', 'Reach %', 'Average rating', 'Ratings', 'Last activity'],
      ...view.insights.map((r) => [
        r.name, r.category, r.pageCount, r.started, r.completed, r.inProgress, r.completionRate,
        r.avgProgress, r.reach, r.ratingCount ? r.avgRating : '', r.ratingCount, r.lastActivity || '',
      ]),
    ];
    downloadCsv(`revibe-material-insights-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    toast.success('Material insights exported');
  };

  return (
    <div className="app-shell">
      <Navbar title="Analytics" />
      <main className="page analytics">
        <header className="page-header">
          <div className="page-header-text">
            <span className="eyebrow">Trainer insights</span>
            <h1 className="page-title">Analytics</h1>
            <p className="page-subtitle">See how every deck is landing: who started, who finished and what people think.</p>
          </div>
          <div className="page-header-actions">
            <button className="btn btn-outline" onClick={handleRefresh} disabled={loading || refreshing}>
              {refreshing ? <Spinner size="sm" /> : <i className="material-icons" aria-hidden="true">refresh</i>}
              Refresh
            </button>
            <button className="btn btn-dark" onClick={exportCsv} disabled={!view || view.insights.length === 0}>
              <i className="material-icons" aria-hidden="true">download</i>
              Export CSV
            </button>
          </div>
        </header>

        {loading ? (
          <AnalyticsSkeleton />
        ) : loadError || !view ? (
          <EmptyState
            icon="cloud_off"
            title="We couldn't load analytics"
            text="Check your connection and try again."
            action={<button className="btn btn-gradient" onClick={handleRefresh}>Try again</button>}
          />
        ) : (
          <>
            <div className="an-stats stagger">
              <StatTile
                icon="groups"
                label="Learners"
                value={view.trainees}
                meta={`${view.trainers} trainer${view.trainers === 1 ? '' : 's'} · ${view.materialCount} materials`}
              />
              <StatTile
                icon="trending_up"
                tone="pink"
                label="Active learners"
                value={view.activeLearners}
                meta={`${view.engagement}% of the team has started`}
              />
              <StatTile
                icon="task_alt"
                tone="green"
                label="Completions"
                value={view.completions}
                meta={`${view.completionRate}% of ${view.enrollments} enrolments`}
              />
              <StatTile
                icon="star"
                tone="orange"
                label="Average rating"
                value={view.ratingCount ? view.avgRating.toFixed(1) : '–'}
                unit={view.ratingCount ? '/5' : undefined}
                meta={`${view.ratingCount} rating${view.ratingCount === 1 ? '' : 's'}`}
              />
            </div>

            <MaterialInsights rows={view.insights} />

            <div className="an-grid an-grid-wide section">
              <ActivityChart series={data.series} />
              <RatingDistribution distribution={view.distribution} total={view.ratingCount} avg={view.avgRating} />
            </div>

            <div className="an-grid section">
              <Leaderboard rows={view.leaderboard} />
              <FeedbackFeed feedback={data.feedback} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function AnalyticsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading analytics">
      <div className="an-stats">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="stat-tile">
            <Skeleton width={38} height={38} radius={12} />
            <Skeleton width="45%" height={28} style={{ marginTop: 8 }} />
            <Skeleton width="70%" height={12} />
          </div>
        ))}
      </div>
      <div className="panel section">
        <div className="panel-head"><Skeleton width={180} height={18} /></div>
        <div className="panel-body an-skel-rows">
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} height={44} />)}
        </div>
      </div>
      <div className="an-grid an-grid-wide section">
        <div className="panel"><div className="panel-body"><Skeleton height={220} /></div></div>
        <div className="panel"><div className="panel-body"><Skeleton height={220} /></div></div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function attentionFlag(r) {
  if (r.started === 0) return { tone: 'neutral', label: 'Not started yet' };
  if (r.ratingCount >= 2 && r.avgRating < 3.5) return { tone: 'warning', label: 'Low rating' };
  if (r.started >= 3 && r.completionRate < 50) return { tone: 'warning', label: 'Low completion' };
  return null;
}

const MOBILE_SORTS = [
  ['started:desc', 'Most learners'],
  ['completionRate:desc', 'Highest completion'],
  ['completionRate:asc', 'Lowest completion'],
  ['avgRating:desc', 'Top rated'],
  ['lastActivity:desc', 'Recent activity'],
  ['name:asc', 'Name A–Z'],
];

function MaterialInsights({ rows }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState({ key: 'started', dir: 'desc' });

  const categories = useMemo(() => [...new Set(rows.map((r) => r.category))].sort(), [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const col = COLUMNS.find((c) => c.key === sort.key) || COLUMNS[1];
    const factor = sort.dir === 'asc' ? 1 : -1;
    return rows
      .filter((r) => category === 'all' || r.category === category)
      .filter((r) => !q || r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q))
      .sort((a, b) => {
        const av = a[col.key];
        const bv = b[col.key];
        let diff;
        if (col.type === 'text') diff = String(av).localeCompare(String(bv));
        else if (col.type === 'date') diff = String(av || '').localeCompare(String(bv || ''));
        else diff = (av || 0) - (bv || 0);
        return diff * factor || b.started - a.started || a.name.localeCompare(b.name);
      });
  }, [rows, query, category, sort]);

  const toggleSort = (key) => {
    setSort((s) => (s.key === key
      ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: key === 'name' ? 'asc' : 'desc' }));
  };

  const sortValue = `${sort.key}:${sort.dir}`;
  const sortLabel = COLUMNS.find((c) => c.key === sort.key)?.label.toLowerCase();

  return (
    <section className="panel section an-insights" aria-labelledby="insights-title">
      <div className="panel-head an-insights-head">
        <div>
          <h2 id="insights-title" className="panel-title">
            <i className="material-icons" aria-hidden="true">table_chart</i>
            Material insights
          </h2>
          <p className="an-panel-sub">
            {visible.length === rows.length ? `${rows.length}` : `${visible.length} of ${rows.length}`} material{rows.length === 1 ? '' : 's'} · sorted by {sortLabel}
          </p>
        </div>
        <div className="an-toolbar">
          <label className="search-field an-search">
            <i className="material-icons" aria-hidden="true">search</i>
            <span className="sr-only">Search materials</span>
            <input
              type="search"
              placeholder="Search materials"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button type="button" className="search-clear" onClick={() => setQuery('')} aria-label="Clear search">
                <i className="material-icons" aria-hidden="true">close</i>
              </button>
            )}
          </label>
          {categories.length > 1 && (
            <label className="an-select-wrap">
              <span className="sr-only">Category</span>
              <select className="select an-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="all">All categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          )}
          <label className="an-select-wrap an-sort-mobile">
            <span className="sr-only">Sort by</span>
            <select
              className="select an-select"
              value={MOBILE_SORTS.some(([v]) => v === sortValue) ? sortValue : ''}
              onChange={(e) => {
                const [key, dir] = e.target.value.split(':');
                setSort({ key, dir });
              }}
            >
              {!MOBILE_SORTS.some(([v]) => v === sortValue) && <option value="" disabled>Sort</option>}
              {MOBILE_SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="panel-body">
          <EmptyState icon="library_books" title="No materials yet" text="Upload a deck from the library and its insights will show up here." />
        </div>
      ) : visible.length === 0 ? (
        <div className="panel-body">
          <EmptyState
            icon="search_off"
            title="No matching materials"
            text="Try a different search or category."
            action={<button className="btn btn-soft" onClick={() => { setQuery(''); setCategory('all'); }}>Clear filters</button>}
          />
        </div>
      ) : (
        <div className="an-table-wrap">
          <table className="an-table">
            <caption className="sr-only">Learner progress and ratings per material</caption>
            <thead>
              <tr>
                {COLUMNS.map((c) => {
                  const active = sort.key === c.key;
                  return (
                    <th
                      key={c.key}
                      scope="col"
                      className={c.type === 'text' ? '' : 'num'}
                      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    >
                      <button type="button" className={`an-sort ${active ? 'active' : ''}`} onClick={() => toggleSort(c.key)}>
                        {c.label}
                        <i className="material-icons" aria-hidden="true">
                          {active ? (sort.dir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                        </i>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const flag = attentionFlag(r);
                return (
                  <tr key={r.id}>
                    <td className="an-cell-material">
                      <Link href={`/viewer?id=${encodeURIComponent(r.id)}`} className="an-material-link">
                        {r.name}
                      </Link>
                      <span className="an-material-meta">
                        <span className="badge badge-purple">{r.category}</span>
                        {r.pageCount > 0 && <span>{r.pageCount} pages</span>}
                        {flag && <span className={`badge badge-${flag.tone}`}>{flag.label}</span>}
                      </span>
                    </td>
                    <td className="num" data-label="Learners">
                      <span className="an-strong">{r.started}</span>
                      <span className="an-sub">{r.reach}% reach</span>
                    </td>
                    <td className="num" data-label="Completed">
                      <span className="an-strong">{r.completed}</span>
                      <span className="an-sub">{r.inProgress} in progress</span>
                    </td>
                    <td className="num an-cell-rate" data-label="Completion rate">
                      <div className="an-rate">
                        <div
                          className="progress-bar"
                          role="progressbar"
                          aria-valuenow={r.completionRate}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${r.name} completion rate`}
                        >
                          <div className="progress-bar-fill" style={{ width: `${r.completionRate}%` }} />
                        </div>
                        <span className="an-strong">{r.started ? `${r.completionRate}%` : '–'}</span>
                      </div>
                    </td>
                    <td className="num" data-label="Rating">
                      {r.ratingCount ? (
                        <span className="an-rating">
                          <i className="material-icons" aria-hidden="true">star</i>
                          <span className="an-strong">{r.avgRating.toFixed(1)}</span>
                          <span className="an-sub">({r.ratingCount})</span>
                        </span>
                      ) : (
                        <span className="an-sub">No ratings</span>
                      )}
                    </td>
                    <td className="num" data-label="Last activity">
                      <span className="an-muted" title={r.lastActivity ? formatDate(r.lastActivity) : undefined}>
                        {r.lastActivity ? timeAgo(r.lastActivity) : 'No activity'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function ActivityChart({ series }) {
  const [active, setActive] = useState(null);
  const max = Math.max(1, ...series.map((d) => Math.max(d.started, d.completed)));
  const ceiling = max <= 4 ? max : Math.ceil(max / 2) * 2;
  const totals = series.reduce(
    (t, d) => ({ started: t.started + d.started, completed: t.completed + d.completed }),
    { started: 0, completed: 0 },
  );
  const label = (d) => formatDate(d.date, { weekday: 'short', day: 'numeric', month: 'short' });
  const current = active != null ? series[active] : null;
  const empty = totals.started + totals.completed === 0;
  const last = series.length - 1;

  const onKeyDown = (e) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (step) {
      e.preventDefault();
      setActive((i) => Math.min(last, Math.max(0, (i == null ? last : i) + step)));
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      setActive(e.key === 'Home' ? 0 : last);
    }
  };

  return (
    <section className="panel" aria-labelledby="activity-title">
      <div className="panel-head an-wrap-head">
        <div>
          <h2 id="activity-title" className="panel-title">
            <i className="material-icons" aria-hidden="true">show_chart</i>
            Learning activity
          </h2>
          <p className="an-panel-sub">Last {series.length} days · {totals.started} started, {totals.completed} completed</p>
        </div>
        <div className="an-legend" aria-hidden="true">
          <span><i className="an-swatch started" />Started</span>
          <span><i className="an-swatch completed" />Completed</span>
        </div>
      </div>
      <div className="panel-body">
        {empty ? (
          <p className="an-empty-note">No one has started or finished a deck in the last {series.length} days.</p>
        ) : (
          <>
            <div
              className="an-chart"
              tabIndex={0}
              role="group"
              aria-label="Daily starts and completions. Use the left and right arrow keys to read each day."
              onKeyDown={onKeyDown}
              onMouseLeave={() => setActive(null)}
              onBlur={() => setActive(null)}
            >
              <div className="an-chart-grid" aria-hidden="true">
                <span data-v={ceiling} />
                <span data-v={ceiling > 1 ? Math.round(ceiling / 2) : ''} />
                <span data-v={0} />
              </div>
              <div className="an-chart-cols" aria-hidden="true">
                {series.map((d, i) => (
                  <div
                    key={d.date}
                    className={`an-col ${active === i ? 'active' : ''}`}
                    onMouseEnter={() => setActive(i)}
                  >
                    <div className="an-col-bars">
                      <span className="an-bar started" style={{ height: `${(d.started / ceiling) * 100}%` }} />
                      <span className="an-bar completed" style={{ height: `${(d.completed / ceiling) * 100}%` }} />
                    </div>
                    <span className={`an-col-label ${(last - i) % 2 ? 'alt' : ''}`}>
                      {formatDate(d.date, { day: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
              {current && (
                <div
                  className={`an-tooltip ${active < 3 ? 'start' : active > last - 3 ? 'end' : ''}`}
                  style={{ left: `${((active + 0.5) / series.length) * 100}%` }}
                  aria-hidden="true"
                >
                  <strong>{label(current)}</strong>
                  <span><i className="an-swatch started" />{current.started} started</span>
                  <span><i className="an-swatch completed" />{current.completed} completed</span>
                </div>
              )}
            </div>
            <p className="sr-only" aria-live="polite">
              {current ? `${label(current)}: ${current.started} started, ${current.completed} completed` : ''}
            </p>
            <table className="sr-only">
              <caption>Daily learning activity</caption>
              <thead><tr><th scope="col">Day</th><th scope="col">Started</th><th scope="col">Completed</th></tr></thead>
              <tbody>
                {series.map((d) => (
                  <tr key={d.date}><th scope="row">{label(d)}</th><td>{d.started}</td><td>{d.completed}</td></tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function RatingDistribution({ distribution, total, avg }) {
  const top = Math.max(1, ...Object.values(distribution));
  return (
    <section className="panel" aria-labelledby="ratings-title">
      <div className="panel-head">
        <h2 id="ratings-title" className="panel-title">
          <i className="material-icons" aria-hidden="true">star_rate</i>
          Ratings
        </h2>
        {total > 0 && (
          <span className="an-rating-head">
            <span className="an-big">{avg.toFixed(1)}</span>
            <Stars value={avg} size={15} />
          </span>
        )}
      </div>
      <div className="panel-body">
        {total === 0 ? (
          <p className="an-empty-note">No ratings yet. They appear once learners rate a deck.</p>
        ) : (
          <ul className="an-dist">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = distribution[star] || 0;
              const pct = Math.round((count / total) * 100);
              return (
                <li key={star} className="an-dist-row">
                  <span className="an-dist-label">
                    {star}
                    <i className="material-icons" aria-hidden="true">star</i>
                    <span className="sr-only"> star</span>
                  </span>
                  <span className="an-dist-track" aria-hidden="true">
                    <span className="an-dist-fill" style={{ width: `${(count / top) * 100}%` }} />
                  </span>
                  <span className="an-dist-count">
                    {count}
                    <small>{pct}%</small>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {total > 0 && <p className="an-dist-foot">{total} rating{total === 1 ? '' : 's'} in total</p>}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

const MEDALS = ['gold', 'silver', 'bronze'];

function Leaderboard({ rows }) {
  return (
    <section className="panel" aria-labelledby="leaders-title">
      <div className="panel-head">
        <h2 id="leaders-title" className="panel-title">
          <i className="material-icons" aria-hidden="true">emoji_events</i>
          Top learners
        </h2>
      </div>
      <div className="panel-body">
        {rows.length === 0 ? (
          <p className="an-empty-note">No learner activity yet.</p>
        ) : (
          <ol className="an-leaders stagger">
            {rows.map((u, i) => (
              <li key={u.uid} className={`an-leader ${i < 3 ? 'podium' : ''}`}>
                <span className={`an-rank ${MEDALS[i] || ''}`}>
                  <span className="sr-only">Rank </span>
                  {i < 3 ? <i className="material-icons" aria-hidden="true">military_tech</i> : null}
                  <span className={i < 3 ? 'sr-only' : ''}>{i + 1}</span>
                </span>
                <Avatar src={u.photoURL} name={u.displayName} size={38} />
                <span className="an-leader-text">
                  <span className="an-leader-name">{u.displayName}</span>
                  <span className="an-sub">{u.inProgress} in progress · {u.pagesViewed} pages read</span>
                </span>
                <span className="an-leader-score">
                  <span className="an-strong">{u.completed}</span>
                  <span className="an-sub">completed</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

const RATING_FILTERS = [
  { key: 'all', label: 'All' },
  { key: '5', label: '5' },
  { key: '4', label: '4' },
  { key: '3', label: '3' },
  { key: 'low', label: '1–2' },
];

function FeedbackFeed({ feedback }) {
  const [filter, setFilter] = useState('all');
  const [limit, setLimit] = useState(FEEDBACK_PAGE);

  const counts = useMemo(() => {
    const c = { all: feedback.length, 5: 0, 4: 0, 3: 0, low: 0 };
    feedback.forEach((f) => {
      if (f.rating >= 3) c[f.rating] = (c[f.rating] || 0) + 1;
      else c.low += 1;
    });
    return c;
  }, [feedback]);

  const filtered = useMemo(() => feedback.filter((f) => {
    if (filter === 'all') return true;
    if (filter === 'low') return f.rating <= 2;
    return String(f.rating) === filter;
  }), [feedback, filter]);

  const shown = filtered.slice(0, limit);

  return (
    <section className="panel" aria-labelledby="feedback-title">
      <div className="panel-head an-wrap-head">
        <h2 id="feedback-title" className="panel-title">
          <i className="material-icons" aria-hidden="true">forum</i>
          Recent feedback
        </h2>
        <div className="segmented" role="group" aria-label="Filter feedback by rating">
          {RATING_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={filter === f.key ? 'active' : ''}
              aria-pressed={filter === f.key}
              onClick={() => { setFilter(f.key); setLimit(FEEDBACK_PAGE); }}
            >
              {f.label}
              {f.key !== 'all' && <i className="material-icons an-seg-star" aria-hidden="true">star</i>}
              <span className="count">{counts[f.key] || 0}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="panel-body">
        {filtered.length === 0 ? (
          <p className="an-empty-note">
            {feedback.length === 0 ? 'No feedback yet. Learners can rate a deck from the viewer.' : 'No feedback with this rating.'}
          </p>
        ) : (
          <>
            <ul className="an-feed">
              {shown.map((f) => (
                <li key={f.id} className="an-feed-item">
                  <Avatar src={f.userPhoto} name={f.userName} size={36} />
                  <div className="an-feed-body">
                    <div className="an-feed-top">
                      <span className="an-feed-name">{f.userName || 'Anonymous'}</span>
                      <Stars value={f.rating} size={14} />
                      <span className="an-sub an-feed-time">{timeAgo(f.updatedAt || f.createdAt)}</span>
                    </div>
                    <Link href={`/viewer?id=${encodeURIComponent(f.materialId)}`} className="an-feed-material">
                      {f.materialName || 'Material'}
                    </Link>
                    {f.comment ? (
                      <p className="an-feed-comment">{f.comment}</p>
                    ) : (
                      <p className="an-feed-comment none">Rated without a comment</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {filtered.length > limit && (
              <button type="button" className="btn btn-soft btn-sm an-more" onClick={() => setLimit((l) => l + FEEDBACK_PAGE)}>
                Show more ({filtered.length - limit} left)
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
