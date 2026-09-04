import React, { useEffect, useMemo, useState } from 'react'
import { PATIENTS } from './data/patients.js'
import Header from './components/Header.jsx'
import PatientSelector from './components/PatientSelector.jsx'
import PatientMAP from './components/PatientMAP.jsx'
import MethodPanel from './components/MethodPanel.jsx'
import ProfessionEntry from './components/ProfessionEntry.jsx'
import ClinicalInsights from './components/ClinicalInsights.jsx'
import { getProfession } from './data/professions.js'

export default function App() {
  const [activeTab, setActiveTab]         = useState('ward')
  const [selectedPatient, setSelectedPatient] = useState(PATIENTS.find(p => p.isPrimaryDemo))
  const [range, setRange] = useState([1, PATIENTS.find(p => p.isPrimaryDemo).lengthOfStay])
  const [excludedDays, setExcludedDays] = useState([])
  const [professionId, setProfessionId] = useState(() => window.localStorage.getItem('psych-map-profession') || 'occupational_therapy')
  const [hasEntered, setHasEntered] = useState(() => Boolean(window.localStorage.getItem('psych-map-profession')))
  const profession = getProfession(professionId)
  const selectedDays = useMemo(
    () => Array.from({ length: range[1] - range[0] + 1 }, (_, index) => range[0] + index).filter(day => !excludedDays.includes(day)),
    [range, excludedDays]
  )

  useEffect(() => {
    setRange([1, selectedPatient.lengthOfStay])
    setExcludedDays([])
  }, [selectedPatient.id, selectedPatient.lengthOfStay])

  const enterWorkspace = () => {
    window.localStorage.setItem('psych-map-profession', professionId)
    setHasEntered(true)
  }

  if (!hasEntered) return <ProfessionEntry selectedId={professionId} onSelect={setProfessionId} onContinue={enterWorkspace} />

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient)
    setActiveTab('map')
  }

  const openPatientInsights = patient => {
    setSelectedPatient(patient)
    setActiveTab('insights')
  }

  const changeRange = updater => {
    setRange(current => typeof updater === 'function' ? updater(current) : updater)
    setExcludedDays([])
  }

  const toggleDay = day => {
    if (day < range[0] || day > range[1]) {
      setRange(([start, end]) => [Math.min(start, day), Math.max(end, day)])
      setExcludedDays(current => current.filter(item => item !== day))
      return
    }
    if (excludedDays.includes(day)) setExcludedDays(current => current.filter(item => item !== day))
    else if (selectedDays.length > 1) setExcludedDays(current => [...current, day])
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedPatient={['map', 'insights'].includes(activeTab) ? selectedPatient : null}
        profession={profession}
        onChangeProfession={() => setHasEntered(false)}
      />

      <main className="flex-1 overflow-auto">
        {activeTab === 'ward' && (
          <PatientSelector
            patients={PATIENTS}
            selectedPatient={selectedPatient}
            onSelect={handleSelectPatient}
            onOpenInsights={openPatientInsights}
            profession={profession}
          />
        )}

        {activeTab === 'map' && selectedPatient && (
          <PatientMAP patient={selectedPatient} range={range} onRangeChange={changeRange} selectedDays={selectedDays} onDayToggle={toggleDay} />
        )}

        {activeTab === 'insights' && selectedPatient && (
          <ClinicalInsights patient={selectedPatient} profession={profession} range={range} selectedDays={selectedDays} onRangeChange={changeRange} />
        )}

        {activeTab === 'method' && (
          <MethodPanel />
        )}
      </main>

      <div className="text-center py-2 text-xs text-slate-400 border-t border-slate-200 bg-white">
        SYNTHETIC DEMONSTRATION DATA ONLY — No real patient information — Psych-MAP Prototype
      </div>
    </div>
  )
}
