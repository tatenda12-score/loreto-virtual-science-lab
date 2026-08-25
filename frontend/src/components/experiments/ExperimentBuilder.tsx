import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createExperiment, updateExperiment, type Experiment, type ExperimentCreatePayload } from '@/services/api'
import { Plus, X, Save, FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExperimentBuilderProps {
  experiment?: Experiment
  onSave: (exp: Experiment) => void
  onCancel: () => void
}

type SimulationType = 'ohms_law' | 'titration' | 'velocity' | 'ph' | 'generic'

interface MaterialItem {
  id: number
  value: string
}

interface InstructionStep {
  id: number
  action: string
}

export default function ExperimentBuilder({ experiment, onSave, onCancel }: ExperimentBuilderProps) {
  const isEditing = !!experiment

  // Basic Fields
  const [title, setTitle] = useState(experiment?.title || '')
  const [description, setDescription] = useState(experiment?.description || '')
  const [subject, setSubject] = useState<ExperimentCreatePayload['subject']>(
    (experiment?.subject as ExperimentCreatePayload['subject']) || 'Physics'
  )
  const [difficulty, setDifficulty] = useState<ExperimentCreatePayload['difficulty']>(
    (experiment?.difficulty as ExperimentCreatePayload['difficulty']) || 'Beginner'
  )
  const [topic, setTopic] = useState(experiment?.topic || '')
  const [simulationType, setSimulationType] = useState<SimulationType>(experiment?.simulation_type || 'generic')
  const [status, setStatus] = useState<ExperimentCreatePayload['status']>(experiment?.status || 'draft')

  // Dynamic Lists
  const [materials, setMaterials] = useState<MaterialItem[]>([{ id: Date.now(), value: '' }])
  const [instructions, setInstructions] = useState<InstructionStep[]>(
    experiment?.instructions
      ? experiment.instructions.map((inst, idx) => ({
          id: Date.now() + idx,
          action: (inst.action as string) || '',
        }))
      : [{ id: Date.now(), action: '' }]
  )

  // Advanced Config
  const [parametersJson, setParametersJson] = useState('{}')
  const [tolerance, setTolerance] = useState('0.05')
  const [expectedValuesJson, setExpectedValuesJson] = useState('{}')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Handlers for Materials
  const addMaterial = () => setMaterials([...materials, { id: Date.now(), value: '' }])
  const removeMaterial = (id: number) => setMaterials(materials.filter((m) => m.id !== id))
  const updateMaterial = (id: number, value: string) =>
    setMaterials(materials.map((m) => (m.id === id ? { ...m, value } : m)))

  // Handlers for Instructions
  const addInstruction = () => setInstructions([...instructions, { id: Date.now(), action: '' }])
  const removeInstruction = (id: number) => setInstructions(instructions.filter((i) => i.id !== id))
  const updateInstruction = (id: number, action: string) =>
    setInstructions(instructions.map((i) => (i.id === id ? { ...i, action } : i)))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Validate Basic Fields
      if (title.length < 3) throw new Error('Title must be at least 3 characters.')
      if (description.length < 10) throw new Error('Description must be at least 10 characters.')

      // Validate JSON
      let params = {}
      let expected = {}
      try {
        params = JSON.parse(parametersJson || '{}')
      } catch {
        throw new Error('Invalid JSON in parameters.')
      }
      try {
        expected = JSON.parse(expectedValuesJson || '{}')
      } catch {
        throw new Error('Invalid JSON in expected values.')
      }

      const gradingConfig = {
        tolerance: parseFloat(tolerance) || 0.05,
        expected_values: expected,
      }

      const finalParameters = {
        ...params,
        topic,
        simulation_type: simulationType,
        materials: materials.map(m => m.value).filter(v => v.trim() !== ''),
        grading_config: gradingConfig,
      }

      const payload: ExperimentCreatePayload = {
        title,
        description,
        subject,
        difficulty,
        topic,
        simulation_type: simulationType,
        materials: materials.map(m => m.value).filter(v => v.trim() !== ''),
        instructions: instructions
          .filter(i => i.action.trim() !== '')
          .map((i, idx) => ({ step: idx + 1, action: i.action })),
        parameters: finalParameters,
        status,
      }

      let savedExperiment: Experiment
      if (isEditing && experiment) {
        savedExperiment = await updateExperiment(experiment.id, payload)
      } else {
        savedExperiment = await createExperiment(payload)
      }

      onSave(savedExperiment)
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Basic Info */}
        <div className="space-y-6">
          <Card className="bg-slate-900/50 border-white/10 text-white">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-lab-violet" />
                Basic Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Simple Pendulum"
                  className="bg-white/5 border-white/10 text-white"
                  required
                  minLength={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the objective and overview..."
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-lab-violet min-h-[100px]"
                  required
                  minLength={10}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <select
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value as any)}
                    className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-lab-violet"
                  >
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Biology">Biology</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <select
                    id="difficulty"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-lab-violet"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="topic">Topic (Optional)</Label>
                  <Input
                    id="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Mechanics"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="simulation_type">Simulation Type</Label>
                  <select
                    id="simulation_type"
                    value={simulationType}
                    onChange={(e) => setSimulationType(e.target.value as any)}
                    className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-lab-violet"
                  >
                    <option value="ohms_law">Ohm's Law</option>
                    <option value="titration">Acid-Base Titration</option>
                    <option value="velocity">Velocity & Motion</option>
                    <option value="ph">pH Scale</option>
                    <option value="generic">Generic Experiment</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/10 text-white">
            <CardHeader>
              <CardTitle className="text-xl">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-6">
                {['draft', 'published', 'archived'].map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value={opt}
                      checked={status === opt}
                      onChange={(e) => setStatus(e.target.value as ExperimentCreatePayload['status'])}
                      className="text-lab-violet focus:ring-lab-violet bg-slate-900 border-white/10"
                    />
                    <span className="capitalize">{opt}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Dynamic Lists & Config */}
        <div className="space-y-6">
          <Card className="bg-slate-900/50 border-white/10 text-white">
            <CardHeader>
              <CardTitle className="text-xl">Materials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {materials.map((m, idx) => (
                <div key={m.id} className="flex items-center gap-2">
                  <span className="w-6 text-sm text-slate-400">{idx + 1}.</span>
                  <Input
                    value={m.value}
                    onChange={(e) => updateMaterial(m.id, e.target.value)}
                    placeholder="e.g. 100mL Beaker"
                    className="bg-white/5 border-white/10 text-white flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMaterial(m.id)}
                    className="text-slate-400 hover:text-red-400 hover:bg-white/5"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMaterial}
                className="mt-2 border-white/10 bg-white/5 hover:bg-white/10 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Material
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/10 text-white">
            <CardHeader>
              <CardTitle className="text-xl">Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {instructions.map((inst, idx) => (
                <div key={inst.id} className="flex items-center gap-2">
                  <span className="w-6 text-sm text-slate-400">Step {idx + 1}</span>
                  <Input
                    value={inst.action}
                    onChange={(e) => updateInstruction(inst.id, e.target.value)}
                    placeholder="Action to perform..."
                    className="bg-white/5 border-white/10 text-white flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeInstruction(inst.id)}
                    className="text-slate-400 hover:text-red-400 hover:bg-white/5"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addInstruction}
                className="mt-2 border-white/10 bg-white/5 hover:bg-white/10 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Step
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/10 text-white">
            <CardHeader>
              <CardTitle className="text-xl">Advanced & Grading Config</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tolerance">Grading Tolerance (0-1)</Label>
                <Input
                  id="tolerance"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={tolerance}
                  onChange={(e) => setTolerance(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expected_values">Expected Values (JSON)</Label>
                <textarea
                  id="expected_values"
                  value={expectedValuesJson}
                  onChange={(e) => setExpectedValuesJson(e.target.value)}
                  placeholder='{"current_A": 3.0, "power_W": 36.0}'
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white font-mono min-h-[80px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-lab-violet"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="parameters">Additional Parameters (JSON)</Label>
                <textarea
                  id="parameters"
                  value={parametersJson}
                  onChange={(e) => setParametersJson(e.target.value)}
                  placeholder='{"environment": "vacuum"}'
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white font-mono min-h-[80px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-lab-violet"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="border-white/10 bg-slate-900 hover:bg-slate-800 text-white"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="bg-lab-violet hover:bg-lab-violet/90 text-white min-w-[120px]"
        >
          {loading ? (
            <span className="animate-pulse">Saving...</span>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {isEditing ? 'Save Changes' : 'Create Experiment'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
