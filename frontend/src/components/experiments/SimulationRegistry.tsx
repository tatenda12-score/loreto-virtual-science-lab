import React from 'react';
import type { Experiment } from '@/services/api';

// Existing Simulation
import OhmsLawSimulation from './OhmsLawSimulation';

// New Simulations (to be created)
import FoodTestsSimulation from './FoodTestsSimulation';
import SeparationSimulation from './SeparationSimulation';
import MomentsSimulation from './MomentsSimulation';
import TitrationSimulation from './TitrationSimulation';
import PhSimulation from './PhSimulation';
import VelocitySimulation from './VelocitySimulation';
import MicroscopySimulation from './MicroscopySimulation';

// L6 Simulations
import EnzymeActivitySimulation from './EnzymeActivitySimulation';
import L6TitrationSimulation from './L6TitrationSimulation';
import InternalResistanceSimulation from './InternalResistanceSimulation';

// U6 Simulations
import PhotosynthesisSimulation from './u6/PhotosynthesisSimulation';
import KineticsSimulation from './u6/KineticsSimulation';
import YoungModulusSimulation from './u6/YoungModulusSimulation';

export interface SimulationProps {
  experiment: Experiment;
  onClose: () => void;
  onSuccess: (score: number | null) => void;
}

export const SimulationRegistry: Record<string, React.FC<SimulationProps>> = {
  ohms_law: OhmsLawSimulation,
  food_tests: FoodTestsSimulation,
  separation: SeparationSimulation,
  moments: MomentsSimulation,
  titration: TitrationSimulation,
  ph: PhSimulation,
  velocity: VelocitySimulation,
  microscopy: MicroscopySimulation,
  enzyme_activity: EnzymeActivitySimulation,
  l6_titration: L6TitrationSimulation,
  internal_resistance: InternalResistanceSimulation,
  u6_photosynthesis: PhotosynthesisSimulation,
  u6_kinetics: KineticsSimulation,
  u6_young_modulus: YoungModulusSimulation,
};
