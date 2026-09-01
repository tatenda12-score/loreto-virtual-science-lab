import React from 'react';
import type { Experiment } from '@/services/api';

// Existing Simulation
import OhmsLawSimulation from './OhmsLawSimulation';

// New Simulations (to be created)
import TitrationSimulation from './TitrationSimulation';
import PhSimulation from './PhSimulation';
import VelocitySimulation from './VelocitySimulation';
import MicroscopySimulation from './MicroscopySimulation';

export interface SimulationProps {
  experiment: Experiment;
  onClose: () => void;
  onSuccess: (score: number | null) => void;
}

export const SimulationRegistry: Record<string, React.FC<SimulationProps>> = {
  ohms_law: OhmsLawSimulation,
  titration: TitrationSimulation,
  ph: PhSimulation,
  velocity: VelocitySimulation,
  microscopy: MicroscopySimulation,
};
