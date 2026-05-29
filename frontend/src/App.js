import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || '/api';

function App() {
  const [metrics, setMetrics] = useState([]);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/metrics`);
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
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!value || isNaN(Number(value))) {
      setSubmitError('Veuillez entrer une valeur numérique valide');
      return;
    }

    try {
      setSubmitError(null);
      const timestamp = new Date().toLocaleString('fr-FR');
      const res = await fetch(`${API_URL}/metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: Number(value), timestamp }),
      });

      if (!res.ok) throw new Error("Erreur lors de l'enregistrement de la métrique");
      
      const newMetric = await res.json();
      setMetrics((prev) => [newMetric, ...prev]);
      setValue('');
    } catch (err) {
      setSubmitError(err.message);
    }
  };

  const totalCount = metrics.length;
  const averageValue = totalCount > 0 
    ? (metrics.reduce((acc, m) => acc + Number(m.value), 0) / totalCount).toFixed(2)
    : 0;
  const lastValue = totalCount > 0 ? metrics[0].value : '-';

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Plateforme de Suivi de Métriques</h1>
        <p className="subtitle">Visualisez vos données système en temps réel</p>
      </header>

      <main className="dashboard-grid">
        <div className="left-panel">
          <section className="stats-container">
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
                <input
                  type="number"
                  step="any"
                  placeholder="Valeur (ex: 23.5)"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="metric-input"
                />
                <button type="submit" className="btn-submit">Envoyer</button>
              </div>
              {submitError && <p className="error-message">{submitError}</p>}
            </form>
          </section>
        </div>

        <div className="right-panel">
          <section className="list-card">
            <h2>Journal des Métriques</h2>
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
                    <div className="metric-badge">
                      <span className="metric-num">{metric.value}</span>
                    </div>
                    <span className="metric-date">{metric.timestamp}</span>
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
