import React from 'react';
import { render, screen, act } from '@testing-library/react';
import App from './App';

describe('App Component', () => {
  beforeEach(() => {
    global.fetch.mockClear();
  });

  it('renders the header title and key dashboard cards', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    await act(async () => {
      render(<App />);
    });

    expect(screen.getByText('Plateforme de Suivi de Métriques')).toBeInTheDocument();
    expect(screen.getByText('Total Métriques')).toBeInTheDocument();
    expect(screen.getByText('Ajouter une Métrique')).toBeInTheDocument();
    expect(screen.getByText('Journal des Métriques')).toBeInTheDocument();
  });
});
