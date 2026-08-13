import React, { useState } from 'react'
import { PATIENTS } from './data/patients.js'
import Header from './components/Header.jsx'
import PatientSelector from './components/PatientSelector.jsx'
import PatientMAP from './components/PatientMAP.jsx'
import MethodPanel from './components/MethodPanel.jsx'
import ProfessionEntry from './components/ProfessionEntry.jsx'
import { getProfession } from './data/professions.js'

export default function App() {
  const [activeTab, setActiveTab]         = useState('ward')
  const [selectedPatient, setSelectedPatient] = useState(PATIENTS.find(p => p.isPrimaryDemo))
  const [professionId, setProfessionId] = useState(() => window.localStorage.getItem('psych-map-profession') || 'occupational_therapy')
  const [hasEntered, setHasEntered] = useState(() => Boolean(window.localStorage.getItem('psych-map-profession')))
  const profession = getProfession(professionId)

  const enterWorkspace = () => {
    window.localStorage.setItem('psych-map-profession', professionId)
    setHasEntered(true)
  }

  if (!hasEntered) return <ProfessionEntry selectedId={professionId} onSelect={setProfessionId} onContinue={enterWorkspace} />

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient)
    setActiveTab('map')
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedPatient={activeTab === 'map' ? selectedPatient : null}
        profession={profession}
        onChangeProfession={() => setHasEntered(false)}
      />

      <main className="flex-1 overflow-auto">
        {activeTab === 'ward' && (
          <PatientSelector
            patients={PATIENTS}
            selectedPatient={selectedPatient}
            onSelect={handleSelectPatient}
            profession={profession}
          />
        )}

        {activeTab === 'map' && selectedPatient && (
          <PatientMAP patient={selectedPatient} profession={profession} />
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
