import React, { useMemo, useState, useEffect } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || '/api';
const DEFAULT_GROUPS = ['general', 'production', 'qualite', 'infra'];

const formatMetricDate = timestamp => {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? timestamp : date.toLocaleString('fr-FR');
};

const buildQueryString = filters => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== '') {
      params.append(key, value);
    }
  });

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
};

function App() {
  const [metrics, setMetrics] = useState([]);
  const [value, setValue] = useState('');
  const [group, setGroup] = useState('general');
  const [customGroup, setCustomGroup] = useState('');
  const [filters, setFilters] = useState({
    minValue: '',
    maxValue: '',
    startDate: '',
    endDate: '',
    group: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [cleanupError, setCleanupError] = useState(null);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const fetchMetrics = async (activeFilters = filters) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/metrics${buildQueryString(activeFilters)}`);
      if (!res.ok) throw new Error('Erreur lors de la récupération des métriques');
      const data = await res.json();
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // fetchMetrics reads the initial filter state only during mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groupOptions = useMemo(() => {
    const knownGroups = metrics.map(metric => metric.group).filter(Boolean);
    return Array.from(new Set([...DEFAULT_GROUPS, ...knownGroups]));
  }, [metrics]);

  const selectedGroup = customGroup.trim() || group;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!value || Number.isNaN(Number(value))) {
      setSubmitError('Veuillez entrer une valeur numérique valide');
      return;
    }

    if (!selectedGroup || selectedGroup.length > 80) {
      setSubmitError('Veuillez entrer un groupe valide de 80 caractères maximum');
      return;
    }

    try {
      setSubmitError(null);
      const timestamp = new Date().toISOString();
      const res = await fetch(`${API_URL}/metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: Number(value), timestamp, group: selectedGroup }),
      });

      if (!res.ok) throw new Error("Erreur lors de l'enregistrement de la métrique");

      const newMetric = await res.json();
      setMetrics((prev) => [newMetric, ...prev]);
      setValue('');
      setCustomGroup('');
    } catch (err) {
      setSubmitError(err.message);
    }
  };

  const handleFilterChange = event => {
    setFilters(prev => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleFilterSubmit = async event => {
    event.preventDefault();
    await fetchMetrics(filters);
  };

  const handleResetFilters = async () => {
    const emptyFilters = {
      minValue: '',
      maxValue: '',
      startDate: '',
      endDate: '',
      group: '',
    };
    setFilters(emptyFilters);
    await fetchMetrics(emptyFilters);
  };

  const handleClearDatabase = async () => {
    setCleanupError(null);
    if (!window.confirm('Supprimer toutes les métriques de la base ?')) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/metrics`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erreur lors du nettoyage de la base');
      setMetrics([]);
    } catch (err) {
      setCleanupError(err.message);
    }
  };

  const sortedChartMetrics = useMemo(
    () => [...metrics].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
    [metrics]
  );

  const chartMetrics = sortedChartMetrics.slice(-8);
  const chartValues = chartMetrics.map(metric => Number(metric.value));
  const chartMax = chartValues.length > 0 ? Math.max(...chartValues, 1) : 1;
  const chartPoints = chartMetrics
    .map((metric, index) => {
      const x = chartMetrics.length === 1 ? 50 : (index / (chartMetrics.length - 1)) * 100;
      const y = 100 - (Number(metric.value) / chartMax) * 90;
      return `${x},${y}`;
    })
    .join(' ');

  const totalCount = metrics.length;
  const averageValue = totalCount > 0
    ? (metrics.reduce((acc, metric) => acc + Number(metric.value), 0) / totalCount).toFixed(2)
    : '0.00';
  const lastValue = totalCount > 0 ? metrics[0].value : '-';

  return (
    <div className="app-container">
      <div className="theme-toggle-container">
        <button
          onClick={toggleTheme}
          className="theme-toggle-btn"
          aria-label="Changer le thème"
          title={theme === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre'}
        >
          {theme === 'dark' ? (
            <svg className="theme-icon" viewBox="0 0 24 24">
              <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.02-.39-1.41 0s-.39 1.02 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.02 0-1.41s-1.02-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z" />
            </svg>
          ) : (
            <svg className="theme-icon" viewBox="0 0 24 24">
              <path d="M12.3 22h-.1c-5.4 0-10-4.6-10-10 0-4.3 2.9-8.1 7.1-9.3.5-.1 1 .2 1.1.7.1.5-.2 1-.7 1.2-3.1 1-5.2 4-5.2 7.4 0 4.4 3.6 8 8 8 3.4 0 6.4-2.1 7.4-5.2.2-.5.7-.8 1.2-.7.5.1.8.6.7 1.1-.9 4.3-4.8 7.1-9.5 6.8z" />
            </svg>
          )}
        </button>
      </div>
      <header className="app-header">
        <h1>Plateforme de Suivi de Métriques</h1>
        <p className="subtitle">Visualisez, filtrez et segmentez vos données système en temps réel</p>
      </header>

      <main className="dashboard-grid">
        <div className="left-panel">
          <section className="stats-container" aria-label="Statistiques des métriques">
            <div className="stat-card">
              <span className="stat-label">Total Métriques</span>
              <span className="stat-value">{totalCount}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Valeur Moyenne</span>
              <span className="stat-value text-gradient">{averageValue}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Dernière Entrée</span>
              <span className="stat-value">{lastValue}</span>
            </div>
          </section>

          <section className="form-card">
            <h2>Ajouter une Métrique</h2>
            <form onSubmit={handleSubmit} className="metric-form">
              <label htmlFor="metric-value">Valeur numérique</label>
              <input
                id="metric-value"
                type="number"
                step="any"
                placeholder="Valeur (ex: 23.5)"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="metric-input"
              />

              <label htmlFor="metric-group">Groupe de saisie</label>
              <div className="input-group">
                <select
                  id="metric-group"
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  className="metric-input"
                >
                  {groupOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <input
                  aria-label="Groupe personnalisé"
                  type="text"
                  placeholder="Nouveau groupe"
                  value={customGroup}
                  onChange={(e) => setCustomGroup(e.target.value)}
                  className="metric-input"
                  maxLength="80"
                />
              </div>

              <button type="submit" className="btn-submit">Envoyer</button>
              {submitError && <p className="error-message">{submitError}</p>}
            </form>
          </section>

          <section className="form-card">
            <h2>Filtres</h2>
            <form onSubmit={handleFilterSubmit} className="filters-grid">
              <label htmlFor="minValue">Valeur min.</label>
              <input
                id="minValue"
                name="minValue"
                type="number"
                step="any"
                value={filters.minValue}
                onChange={handleFilterChange}
                className="metric-input"
              />

              <label htmlFor="maxValue">Valeur max.</label>
              <input
                id="maxValue"
                name="maxValue"
                type="number"
                step="any"
                value={filters.maxValue}
                onChange={handleFilterChange}
                className="metric-input"
              />

              <label htmlFor="startDate">Date début</label>
              <input
                id="startDate"
                name="startDate"
                type="date"
                value={filters.startDate}
                onChange={handleFilterChange}
                className="metric-input"
              />

              <label htmlFor="endDate">Date fin</label>
              <input
                id="endDate"
                name="endDate"
                type="date"
                value={filters.endDate}
                onChange={handleFilterChange}
                className="metric-input"
              />

              <label htmlFor="filterGroup">Groupe</label>
              <select
                id="filterGroup"
                name="group"
                value={filters.group}
                onChange={handleFilterChange}
                className="metric-input"
              >
                <option value="">Tous</option>
                {groupOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>

              <div className="actions-row">
                <button type="submit" className="btn-submit">Filtrer</button>
                <button type="button" className="btn-secondary" onClick={handleResetFilters}>Réinitialiser</button>
              </div>
            </form>
          </section>
        </div>

        <div className="right-panel">
          <section className="list-card chart-card" aria-label="Graphique des métriques">
            <h2>Graphique</h2>
            {metrics.length === 0 ? (
              <p className="status-text italic">Le graphique apparaîtra après la première métrique.</p>
            ) : (
              <div className="chart-wrapper">
                <svg viewBox="0 0 100 110" role="img" aria-label="Courbe des dernières métriques">
                  <polyline points={chartPoints} fill="none" stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke" />
                  {chartMetrics.map((metric, index) => {
                    const x = chartMetrics.length === 1 ? 50 : (index / (chartMetrics.length - 1)) * 100;
                    const y = 100 - (Number(metric.value) / chartMax) * 90;
                    return <circle key={metric.id} cx={x} cy={y} r="2.5" />;
                  })}
                </svg>
                <p className="chart-caption">Dernières métriques affichées selon les filtres actifs.</p>
              </div>
            )}
          </section>

          <section className="list-card">
            <div className="list-header">
              <h2>Journal des Métriques</h2>
              <button type="button" className="btn-danger" onClick={handleClearDatabase}>Nettoyer la DB</button>
            </div>
            {cleanupError && <p className="error-message">{cleanupError}</p>}
            {loading ? (
              <p className="status-text">Chargement des métriques...</p>
            ) : error ? (
              <p className="error-message">Erreur: {error}</p>
            ) : metrics.length === 0 ? (
              <p className="status-text italic">Aucune métrique enregistrée pour le moment.</p>
            ) : (
              <div className="metrics-list">
                {metrics.map((metric) => (
                  <div key={metric.id} className="metric-item">
                    <div>
                      <div className="metric-badge">
                        <span className="metric-num">{metric.value}</span>
                      </div>
                      <span className="metric-group">{metric.group || 'general'}</span>
                    </div>
                    <span className="metric-date">{formatMetricDate(metric.timestamp)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
