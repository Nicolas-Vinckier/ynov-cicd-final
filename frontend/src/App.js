import React, { useCallback, useEffect, useState } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || '/api';

function App() {
  const [metrics, setMetrics] = useState([]);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/metrics`);

      if (!res.ok) {
        throw new Error('Erreur lors de la récupération des métriques');
      }

      const data = await res.json();
      setMetrics(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const parsedValue = Number(value);
    if (value.trim() === '' || !Number.isFinite(parsedValue)) {
      setSubmitError('Veuillez entrer une valeur numérique valide');
      return;
    }

    try {
      setSubmitError(null);
      const timestamp = new Date().toISOString();
      const res = await fetch(`${API_URL}/metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: parsedValue, timestamp }),
      });

      if (!res.ok) {
        throw new Error("Erreur lors de l'enregistrement de la métrique");
      }

      const newMetric = await res.json();
      setMetrics((prev) => [newMetric, ...prev]);
      setValue('');
    } catch (err) {
      setSubmitError(err.message);
    }
  };

  const totalCount = metrics.length;
  const averageValue = totalCount > 0
    ? (metrics.reduce((acc, metric) => acc + Number(metric.value), 0) / totalCount).toFixed(2)
    : '0.00';
  const lastValue = totalCount > 0 ? metrics[0].value : '-';

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Plateforme de Suivi de Métriques</h1>
        <p className="subtitle">Visualisez vos données système en temps réel</p>
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
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label className="visually-hidden" htmlFor="metric-value">Valeur de la métrique</label>
                <input
                  id="metric-value"
                  type="number"
                  step="any"
                  placeholder="Valeur (ex: 23.5)"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  className="metric-input"
                />
                <button type="submit" className="btn-submit">Envoyer</button>
              </div>
              {submitError && <p className="error-message" role="alert">{submitError}</p>}
            </form>
          </section>
        </div>

        <div className="right-panel">
          <section className="list-card">
            <h2>Journal des Métriques</h2>
            {loading ? (
              <p className="status-text">Chargement des métriques...</p>
            ) : error ? (
              <p className="error-message" role="alert">Erreur: {error}</p>
            ) : metrics.length === 0 ? (
              <p className="status-text italic">Aucune métrique enregistrée pour le moment.</p>
            ) : (
              <div className="metrics-list" aria-label="Liste des métriques enregistrées">
                {metrics.map((metric) => (
                  <div key={metric.id} className="metric-item">
                    <div className="metric-badge">
                      <span className="metric-num">{metric.value}</span>
                    </div>
                    <time className="metric-date" dateTime={metric.timestamp}>{metric.timestamp}</time>
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
