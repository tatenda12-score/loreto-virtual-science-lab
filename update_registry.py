import os

filepath = 'frontend/src/components/experiments/SimulationRegistry.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

new_imports = '''// New Simulations (to be created)
import FoodTestsSimulation from './FoodTestsSimulation';
import SeparationSimulation from './SeparationSimulation';
import MomentsSimulation from './MomentsSimulation';
import TitrationSimulation from './TitrationSimulation';
import PhSimulation from './PhSimulation';
import VelocitySimulation from './VelocitySimulation';
import MicroscopySimulation from './MicroscopySimulation';'''

content = content.replace('''// New Simulations (to be created)
import TitrationSimulation from './TitrationSimulation';
import PhSimulation from './PhSimulation';
import VelocitySimulation from './VelocitySimulation';
import MicroscopySimulation from './MicroscopySimulation';''', new_imports)

new_registry = '''export const SimulationRegistry: Record<string, React.FC<SimulationProps>> = {
  ohms_law: OhmsLawSimulation,
  food_tests: FoodTestsSimulation,
  separation: SeparationSimulation,
  moments: MomentsSimulation,
  titration: TitrationSimulation,
  ph: PhSimulation,
  velocity: VelocitySimulation,
  microscopy: MicroscopySimulation,
};'''

content = content.replace('''export const SimulationRegistry: Record<string, React.FC<SimulationProps>> = {
  ohms_law: OhmsLawSimulation,
  titration: TitrationSimulation,
  ph: PhSimulation,
  velocity: VelocitySimulation,
  microscopy: MicroscopySimulation,
};''', new_registry)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
